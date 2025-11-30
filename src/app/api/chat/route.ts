import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import { db } from "@/db";
import { chats, messages, userCredits } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { MINIMUM_CREDITS_THRESHOLD } from "@/lib/flip";

// Initialize the Google AI client with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function fileToGenerativePart(image: string) {
  return {
    inlineData: {
      data: image.split(",")[1],
      mimeType: image.split(";")[0].split(":")[1],
    },
  };
}

async function getOrCreateUserCredits(userId: string) {
  let credit = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });

  if (!credit) {
    const [newCredit] = await db
      .insert(userCredits)
      .values({
        id: `credit_${Date.now()}`,
        userId: userId,
        credits: 3000, // 3000 tokens for new user trial
      })
      .returning();
    credit = newCredit;
  }

  return credit;
}

async function deductTokens(userId: string, tokenCount: number) {
  if (tokenCount <= 0) return;

  await db
    .update(userCredits)
    .set({
      credits: sql`credits - ${tokenCount}`,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.userId, userId));

  logger.info("Tokens deducted", { userId, tokenCount });
}

export async function POST(request: Request) {
  logger.info("Chat request received");
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("Chat request failed: User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      image,
      chatId: incomingChatId,
      force_image,
      isTemporary,
    } = body;

    if (!message && !image) {
      logger.warn("Chat request failed: No message or image provided");
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    // --- Universal Logic: Prepare History ---
    const chatHistory = incomingChatId
      ? await db.query.messages.findMany({
          where: and(
            eq(messages.chatId, incomingChatId),
            eq(messages.userId, user.id)
          ),
          orderBy: [desc(messages.createdAt)],
          limit: 10,
        })
      : [];

    const formattedHistory = chatHistory.reverse().flatMap((msg) => {
      const parts = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.attachments && msg.attachments.length > 0) {
        for (const attachment of msg.attachments) {
          if (attachment.url && attachment.url.startsWith("data:image/")) {
            parts.push({
              inlineData: {
                mimeType: attachment.url.split(";")[0].split(":")[1],
                data: attachment.url.split(",")[1],
              },
            });
          }
        }
      }
      return {
        role: msg.role === "user" ? "user" : "model",
        parts,
      };
    });

    // --- Universal Logic: Intent Detection ---
    const imageGenerationKeywords = [
      "generate image",
      "create a picture of",
      "draw",
    ];
    const isImageGenerationRequest =
      force_image ||
      imageGenerationKeywords.some((kw: string) =>
        message.toLowerCase().includes(kw)
      );

    // --- Universal Logic: System Instruction ---
    const systemInstruction = `You are a helpful, smart, and creative AI assistant. 
    Your goal is to be insightful and proactive.
    
    INSTRUCTIONS:
    1. Answer the user's query thoroughly and politely.
    2. At the end of your response, provide 3 relevant follow-up questions or topics the user might be interested in.
    3. FORMATTING FOR FOLLOW-UPS:
       - Present them as a distinct bulleted list (using "-" or "•").
       - Do NOT bury them in a paragraph.
       - Precede the list with a brief conversational transition (e.g., "Here are a few things we could explore next:").
    4. AFTER your main response (including the bulleted list), append a structured JSON block containing those same 3 suggestions.
    
    FORMATTING INSTRUCTIONS FOR JSON:
    - The JSON block must be at the very end.
    - Use a strictly JSON format wrapped in a specific delimiter: |||{ "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"] }|||
    - Do NOT wrap the JSON in markdown code blocks. Just the raw JSON string inside ||| and |||.
    - If the user's message is just a greeting, you may skip the suggestions.`;

    // --- Helper to parse suggestions ---
    const parseResponse = (rawText: string) => {
      const delimiterRegex = /\|\|\|(\{.*?\})\|\|\|/s;
      const match = rawText.match(delimiterRegex);

      let cleanText = rawText;
      let suggestions: string[] = [];

      if (match && match[1]) {
        try {
          const json = JSON.parse(match[1]);
          if (Array.isArray(json.suggestions)) {
            suggestions = json.suggestions;
          }
          // Remove the JSON block from the text
          cleanText = rawText.replace(match[0], "").trim();
        } catch (e) {
          logger.warn("Failed to parse suggestions JSON", { error: e });
        }
      }
      return { cleanText, suggestions };
    };

    // --- Handle Temporary Chat ---
    if (isTemporary) {
      logger.info("Handling temporary chat request");

      // Temporary Image Generation
      if (isImageGenerationRequest || image) {
        // ... (Image generation logic remains the same, but we need to ensure we use the right model config if we were to apply system instructions here too, but for now we focus on text)
        const model = genAI.getGenerativeModel({
          model: "gemini-3-pro-image-preview",
        });
        logger.info("Performing temporary AI image task...");

        let finalPrompt;
        if (formattedHistory.length <= 1) {
          logger.info(
            "No significant history, using user message directly as prompt."
          );
          finalPrompt = message;
        } else {
          const briefResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/generate-creative-brief`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ history: formattedHistory }),
            }
          );
          if (!briefResponse.ok)
            throw new Error("Failed to generate creative brief");
          const { summarizedPrompt } = await briefResponse.json();
          finalPrompt = summarizedPrompt;
        }

        const imageParts = formattedHistory.flatMap((msg: any) =>
          msg.parts.filter((part: any) => part.inlineData)
        );
        if (image) {
          imageParts.push(await fileToGenerativePart(image));
        }

        const responseStream = await model.generateContentStream([
          finalPrompt,
          ...imageParts,
        ]);
        let accumulatedResponse = { reply: "", imageUrl: "" };
        for await (const chunk of responseStream.stream) {
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const inlineData = chunk.candidates[0].content.parts[0].inlineData;
            accumulatedResponse.imageUrl = `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data || ""}`;
          }
          const text = chunk.text();
          if (text) accumulatedResponse.reply += text;
        }
        return NextResponse.json({
          ...accumulatedResponse,
          timestamp: new Date().toISOString(),
        });
      }

      // Temporary Text Generation
      logger.info("Generating temporary AI text response...");
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        systemInstruction: systemInstruction,
      });
      const chat = model.startChat({ history: formattedHistory });
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      const { cleanText, suggestions } = parseResponse(text);

      return NextResponse.json({
        reply: cleanText,
        suggestions,
        timestamp: new Date().toISOString(),
      });
    }

    // --- Credit Check for Persistent Chat ---
    const creditRecord = await getOrCreateUserCredits(user.id);
    if (creditRecord.credits < MINIMUM_CREDITS_THRESHOLD) {
      logger.warn("User has insufficient credits", {
        userId: user.id,
        credits: creditRecord.credits,
        minimumRequired: MINIMUM_CREDITS_THRESHOLD,
      });
      return NextResponse.json(
        {
          error: `Insufficient credits. You need at least ${MINIMUM_CREDITS_THRESHOLD.toLocaleString()} tokens to chat. Please top up your account.`,
        },
        { status: 403 }
      );
    }

    // --- Handle Persistent Chat ---
    let currentChatId = incomingChatId;
    if (!currentChatId) {
      logger.info("Creating new chat for user", { userId: user.id });
      try {
        const [newChat] = await db
          .insert(chats)
          .values({
            id: `chat_${Date.now()}`,
            userId: user.id,
            title: message.substring(0, 100),
          })
          .returning();
        currentChatId = newChat.id;
        logger.info("New chat created successfully", { chatId: currentChatId });
      } catch (dbError) {
        logger.error("Failed to create new chat", { error: dbError });
        throw dbError; // Re-throw to be caught by the outer block
      }
    } else {
      logger.info("Using existing chat", { chatId: currentChatId });
    }

    try {
      await db.insert(messages).values({
        id: `msg_${Date.now()}`,
        chatId: currentChatId,
        userId: user.id,
        role: "user",
        content: message,
        attachments: image
          ? [{ type: image.split(";")[0].split(":")[1], url: image }]
          : [],
      });
      logger.info("User message saved to DB", {
        chatId: currentChatId,
        userId: user.id,
      });
    } catch (dbError) {
      logger.error("Failed to save user message to DB", {
        error: dbError,
        chatId: currentChatId,
      });
      throw dbError;
    }

    // Persistent Image Generation
    if (isImageGenerationRequest || image) {
      // ... (Image generation logic remains largely same, just ensuring variables are correct)
      logger.info("Performing persistent AI image task...");

      let finalPrompt;
      if (formattedHistory.length <= 1) {
        logger.info(
          "No significant history, using user message directly as prompt."
        );
        finalPrompt = message;
      } else {
        const briefResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/generate-creative-brief`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history: formattedHistory }),
          }
        );
        if (!briefResponse.ok)
          throw new Error("Failed to generate creative brief");
        const { summarizedPrompt } = await briefResponse.json();
        finalPrompt = summarizedPrompt;
      }

      const imageParts = formattedHistory.flatMap((msg: any) =>
        msg.parts.filter((part: any) => part.inlineData)
      );
      if (image) {
        imageParts.push(await fileToGenerativePart(image));
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-3-pro-image-preview",
      }); // No system instruction for image gen model usually
      const responseStream = await model.generateContentStream([
        finalPrompt,
        ...imageParts,
      ]);

      let accumulatedResponse = { reply: "", imageUrl: "" };
      for await (const chunk of responseStream.stream) {
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          accumulatedResponse.imageUrl = `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data || ""}`;
        }
        const text = chunk.text();
        if (text) accumulatedResponse.reply += text;
      }

      // Get token usage from aggregated response
      const aggregatedResponse = await responseStream.response;
      const outputTokens =
        aggregatedResponse.usageMetadata?.candidatesTokenCount || 0;
      logger.info("Image generation token usage", { outputTokens });

      // --- NEW: Upload Generated Image to Supabase Storage ---
      if (
        accumulatedResponse.imageUrl &&
        accumulatedResponse.imageUrl.startsWith("data:")
      ) {
        try {
          const base64Data = accumulatedResponse.imageUrl.split(",")[1];
          const mimeType = accumulatedResponse.imageUrl
            .split(";")[0]
            .split(":")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const fileExtension = mimeType.split("/")[1] || "png";
          const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

          logger.info(
            `Uploading generated image to Supabase Storage as ${fileName}...`
          );

          const { error: uploadError } = await supabase.storage
            .from("chat-media")
            .upload(fileName, buffer, {
              contentType: mimeType,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("chat-media").getPublicUrl(fileName);

          accumulatedResponse.imageUrl = publicUrl;
          logger.info(`Image uploaded successfully. Public URL: ${publicUrl}`);
        } catch (uploadError) {
          logger.error(
            "Failed to upload generated image to Supabase Storage:",
            uploadError
          );
          // Fallback is to keep the base64 string in accumulatedResponse.imageUrl
        }
      }

      logger.info("Attempting to save AI image response to DB...", {
        chatId: currentChatId,
      });
      try {
        await db.insert(messages).values({
          id: `msg_${Date.now() + 1}`,
          chatId: currentChatId,
          userId: user.id,
          role: "ai",
          content:
            accumulatedResponse.reply || `Generated image for: ${message}`,
          attachments: accumulatedResponse.imageUrl
            ? [{ type: "image/png", url: accumulatedResponse.imageUrl }]
            : [],
        });
        logger.info("AI image response saved successfully", {
          chatId: currentChatId,
        });
      } catch (dbError) {
        logger.error("Failed to save AI image response to DB", {
          error: dbError,
          chatId: currentChatId,
        });
      }

      // Deduct tokens after successful response
      await deductTokens(user.id, outputTokens);

      return NextResponse.json({
        ...accumulatedResponse,
        chatId: currentChatId,
        tokensUsed: outputTokens,
        timestamp: new Date().toISOString(),
      });
    }

    // Persistent Text Generation
    logger.info("Generating persistent AI text response...");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemInstruction,
    });
    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Get token usage from response
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
    logger.info("Text generation token usage", { outputTokens });

    const { cleanText, suggestions } = parseResponse(text);

    logger.info("Attempting to save AI text response to DB...", {
      chatId: currentChatId,
    });
    try {
      await db.insert(messages).values({
        id: `msg_${Date.now() + 1}`,
        chatId: currentChatId,
        userId: user.id,
        role: "ai",
        content: cleanText, // Save clean text without the JSON block
        attachments: [],
      });
      logger.info("AI text response saved successfully", {
        chatId: currentChatId,
      });
    } catch (dbError) {
      logger.error("Failed to save AI text response to DB", {
        error: dbError,
        chatId: currentChatId,
      });
    }

    // Deduct tokens after successful response
    await deductTokens(user.id, outputTokens);

    return NextResponse.json({
      reply: cleanText,
      suggestions,
      chatId: currentChatId,
      tokensUsed: outputTokens,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred";
    const errorStack = error.stack || "No stack trace available";
    logger.error("Error in /api/chat", {
      message: errorMessage,
      stack: errorStack,
      errorObject: error,
    });
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
