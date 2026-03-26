import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request) {
    try {
        // getting domain knowledge and difficulty (1-3)
        const { domain, difficulty } = await request.json();

        const respone = await openai.responses.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a goofy ahh robot."
                },
                {
                    role: "user",
                    content: `Domain Knowledge: ${domain}. Difficulty: ${difficulty}.`
                },
            ],
        })
    } catch (error) {
        console.error("Error initializing game:", error);
        return NextResponse.json(
            { error: "Failed to init game." },
            { status : 500 }
        );
    }
};