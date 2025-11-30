import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { prompt, language, format } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const systemPrompt = `You are an expert prompt engineer. Your goal is to refine the following user-constructed prompt into a high-quality, clear, and optimized prompt for Large Language Models (LLMs).

    Follow these rules:
    1.  **Language**: The output MUST be in ${language || 'English'}.
    2.  **Clarity**: Ensure the objective is unmistakable.
    3.  **Context**: Preserve all context provided by the user.
    4.  **Structure**: Use clean spacing and indentation.
    5.  **Formatting**: 
        - If the requested format is "Plain Text", do NOT use markdown bolding (**text**) or italics (*text*). Keep it clean and ready to copy-paste.
        - If the requested format is "Markdown", use appropriate markdown.
        - Current requested format: ${format || 'Plain Text'}.
    6.  **Persona**: If a persona was specified, ensure it is strongly adopted.
    7.  **Constraints**: strictly enforce any constraints mentioned.
    8.  **Optimization**: Add "Chain of Thought" or "Step-by-Step" instructions if the task is complex.
    9.  **Output**: Return ONLY the refined prompt. Do not add conversational filler like "Here is your refined prompt:".

    Original Prompt:
    ${prompt}`;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const refinedPrompt = response.text();

        return NextResponse.json({ refinedPrompt });
    } catch (error) {
        console.error('Error refining prompt:', error);
        return NextResponse.json(
            { error: 'Failed to refine prompt' },
            { status: 500 }
        );
    }
}
