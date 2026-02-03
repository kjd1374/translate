import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
    }

    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;
        const sourceLang = formData.get('sourceLang') as string; // 'ko' or 'vi'
        const targetLang = formData.get('targetLang') as string;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // Convert audio to base64
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Prompt construction
        const prompt = `
    You are a professional interpreter for a Korean/Vietnamese couple.
    Analyze the attached audio which is in ${sourceLang === 'ko' ? 'Korean' : 'Vietnamese'}.
    
    1. Transcribe the audio exactly.
    2. Translate it naturally to ${targetLang === 'ko' ? 'Korean' : 'Vietnamese'}.
    
    Return ONLY a JSON object with this format (no markdown):
    {
      "originalText": "transcription here",
      "translatedText": "translation here"
    }
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: audioBase64
                }
            }
        ]);

        const responseText = result.response.text();
        console.log("Gemini Raw Response:", responseText);

        // Clean up potential markdown formatting (```json ... ```)
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        let parsed;
        try {
            parsed = JSON.parse(cleanedJson);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            // Fallback or better error handling
            return NextResponse.json({ error: "Failed to parse Gemini response" }, { status: 500 });
        }

        return NextResponse.json({
            originalText: parsed.originalText,
            translatedText: parsed.translatedText,
            // No audioUrl back from Gemini text-only response. Client will handle TTS.
            audioUrl: null
        });

    } catch (error: any) {
        console.error("Translation API Error:", error);
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
}
