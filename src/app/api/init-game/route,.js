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
                    content: `
                                You are a Game Architect. Your task is to generate a secret keyword and a blacklist of forbidden words based 
                                on a domain and a specific opponent personality.

                                ### DIFFICULTY MAPPING:
                                - If the opponent is "The Slacker": Pick a very common, easy-to-guess noun.
                                - If the opponent is "The Professor": Pick a technical, academic, or professional term.
                                - If the opponent is "The Riddler": Pick an abstract, conceptual, or elusive word.

                                ### BLACKLIST RULES:
                                Identify the 5 most "obvious" words associated with the keyword. If the player hears these, the game becomes too easy.

                                ### OUTPUT FORMAT:
                                Return ONLY a JSON object:
                                {
                                "keyword": "SECRET_WORD",
                                "blacklist": ["word1", "word2", "word3", "word4", "word5"]
                                }
                            `
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