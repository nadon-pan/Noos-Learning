import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

// to set runtime to edge:
// export const runtime = 'edge';

export async function POST(request) {
    try {
        const { message, history } = await request.json();

        // Rate limiting stuff below:
        //

        // Getting domain knowledge, difficulty/personality, keyword from db below:
        //

        const systemPrompt = `
            You are a robot.

            PERSONALITY:

            STRICT RULES:
            1. xxx
            2. xxx
            3. xxx
            4. xxx
        `
        
        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                ...history,
                {
                    role: "user",
                    content: message
                },
            ],
        })

    } catch (error) {
        console.error("Chatbot Error:", error);
        return NextResponse.json(
            { error: "Chatbot Failure" },
            { status : 500 }
        );
    }
}