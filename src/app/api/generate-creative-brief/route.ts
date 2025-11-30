import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  logger.info('Creative brief generation request received');
  try {
    const { history } = await request.json();

    if (!history || !Array.isArray(history)) {
      logger.warn('Creative brief generation failed: No history provided');
      return NextResponse.json({ error: 'Conversation history is required' }, { status: 400 });
    }

    // If history is short, just use the last message as the prompt
    if (history.length <= 1) {
      const lastMessage = history[history.length - 1];
      const summarizedPrompt = lastMessage?.parts.map((p: any) => p.text).join(' ') || '';
      logger.info('History is short, using last message directly as prompt', { summarizedPrompt });
      return NextResponse.json({ summarizedPrompt });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const textHistory = history.map(item => `${item.role}: ${item.parts.map((p: any) => p.text).join(' ')}`).join('\n');

    const systemPrompt = `You are a creative director's assistant. Your job is to read the following conversation history. Your goal is to synthesize all the key creative details, ideas, and requests into a single, concise, and powerful prompt. This prompt will be given to an AI image generation model. Create the best possible prompt that captures the user's full intent based on the entire conversation.

CONVERSATION HISTORY:
---
${textHistory}
---

Based on the history, generate a single, optimized prompt for the image generation model.`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const summarizedPrompt = response.text().trim();

    logger.info('Creative brief generated successfully', { summarizedPrompt });
    return NextResponse.json({ summarizedPrompt });

  } catch (error: any) {
    const errorMessage = error.message || 'An unexpected error occurred';
    const errorStack = error.stack || 'No stack trace available';
    logger.error('Error in /api/generate-creative-brief', { 
      message: errorMessage,
      stack: errorStack,
      errorObject: error
    });
    return NextResponse.json({ error: 'Failed to generate creative brief' }, { status: 500 });
  }
}
