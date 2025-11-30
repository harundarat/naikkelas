import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  logger.info("Intent detection request received");
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      logger.warn("Intent detection failed: No message provided");
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" }); // Using a fast model for intent detection

    const prompt = `Analyze the following user message and determine if the primary intent is 'text', 'image_generation', or 'video_generation'. Respond with only one of those three words.

User message: "${message}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const intent = response.text().trim().toLowerCase();

    if (["text", "image_generation", "video_generation"].includes(intent)) {
      logger.info("Intent detected successfully", { message, intent });
      return NextResponse.json({ intent });
    } else {
      logger.warn("AI returned an unexpected intent", {
        message,
        aiResponse: intent,
      });
      return NextResponse.json({ intent: "text" }); // Default to text if AI is unsure or responds unexpectedly
    }
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred";
    const errorStack = error.stack || "No stack trace available";
    logger.error("Error in /api/detect-intent", {
      message: errorMessage,
      stack: errorStack,
      errorObject: error,
    });
    return NextResponse.json(
      { error: "Failed to detect intent" },
      { status: 500 }
    );
  }
}
