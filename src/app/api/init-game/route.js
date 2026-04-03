import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

// POST /api/init-game
// Called by the lobby when a player starts a new game.
// Accepts: { domain, personality, usedKeywords[] }
// Returns: { keyword, blacklist, domain, personality }
export async function POST(request) {
    try {
        // usedKeywords is sent by the client (stored in localStorage per domain)
        // and used to prevent the same term appearing twice in the same domain.
        const { domain, personality, usedKeywords = [] } = await request.json();

        // Build an exclusion string only when the player has seen keywords before.
        // Without this, gpt-4o-mini tends to pick the most obvious concept repeatedly
        // (e.g. "Pipeline" for CI/CD every time).
        const exclusionClause = usedKeywords.length > 0
            ? `ALREADY USED — DO NOT PICK THESE: ${usedKeywords.join(', ')}. Pick something the player hasn't seen yet.`
            : '';

        const systemPrompt = `
            You are a Strategic Game Designer. Your task is to initialize a "Secret Keyword" and a "Blacklist" of forbidden words based on a domain and a specific opponent personality for a deduction game.

            ### STRATEGY BY PERSONALITY:
            - "The Slacker" (Easy): Pick a very common, tangible noun within ${domain}.
            - "The Professor" (Medium): Pick a technical term or academic concept within ${domain}.
            - "The Riddler" (Hard): Pick an abstract or multifaceted concept within ${domain}.

            ### RULES:
            1. TARGET: The keyword MUST be a core part of the "${domain}" domain.
            2. VARIETY (CRITICAL): ${exclusionClause || 'Pick an interesting and specific concept — avoid the most obvious first choice.'}
            3. BLACKLIST: Identify 5-10 most "obvious" words associated with the keyword. If the player hears these, the game becomes too easy.
            4. OUTPUT: Return ONLY a JSON object.

            ### OUTPUT RULES:
                Return ONLY a JSON object in the following format, strictly following the keys and structure. DO NOT include any explanatory text or formatting outside of the JSON:
                {
                "keyword": "string",
                "blacklist": ["string", "string", "string", "string", "string"],
                }
        `;

        // temperature: 1.1 — above default (1.0) to increase keyword variety.
        // response_format: json_object ensures clean parseable output without markdown wrapping.
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `Generate a game setup. Domain: ${domain}. Personality: ${personality}.`,
                }
            ],
            response_format: { type: "json_object" },
            temperature: 1.1,
        });

        const gameData = JSON.parse(completion.choices[0].message.content);

        return NextResponse.json({
            success: true,
            domain: domain,
            keyword: gameData.keyword,
            blacklist: gameData.blacklist,
            personality: personality,
        });

    } catch (error) {
        console.error("Error initializing game:", error);
        return NextResponse.json(
            { error: "Failed to initialise game." },
            { status: 500 }
        );
    }
}
