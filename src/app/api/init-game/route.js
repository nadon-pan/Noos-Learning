import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request) {
console.log("--- INIT API HIT ---");
    try {
        // const body = await request.json(); // DEBUG
        // console.log("Payload received:", body); // DEBUG

        // getting domain knowledge and difficulty (1-3)
        const { domain, personality } = await request.json();

        const systemPrompt = `
            You are a Strategic Game Designer. Your task is to initialize a "Secret Keyword" and a "Blacklist" of forbidden words based on a domain and a specific opponent personality for a deduction game.
      
            ### STRATEGY BY PERSONALITY:
            - "The Slacker" (Easy): Pick a very common, tangible noun within ${domain}.
            - "The Professor" (Medium): Pick a technical term or academic concept within ${domain}.
            - "The Riddler" (Hard): Pick an abstract or multifaceted concept within ${domain}.

            ### RULES:
            1. TARGET: The keyword MUST be a core part of the "${domain}" domain.
            2. BLACKLIST: Identify 5-10 most "obvious" words associated with the keyword. If the player hears these, the game becomes too easy.
            3. OUTPUT: Return ONLY a JSON object.

            ### OUTPUT RULES:
            Return ONLY a JSON object in the following format:
                {
                "keyword": "string",
                "blacklist": ["string", "string", "string", "string", "string"],
                }
        `
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: systemPrompt },
                { 
                    role: "user", 
                    content: `Generate a game setup. Domain: ${domain}. Personality: ${personality}.` 
                }
            ],
            response_format: { type: "json_object" },
        });

        const gameData = JSON.parse(completion.choices[0].message.content);

        console.log("Generated Game Data:", gameData); // DEBUG

        return NextResponse.json({
            success: true,
            domain: domain,
            keyword: gameData.keyword, 
            blacklist: gameData.blacklist 
        });

    } catch (error) {
        console.error("Error initializing game:", error);
        return NextResponse.json(
            { error: "Failed to initialise game." },
            { status : 500 }
        );
    }
};