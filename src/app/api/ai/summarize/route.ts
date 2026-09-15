import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
  },
  required: ["summary"],
};

/** Longest note forwarded to the model (roughly two pages of text). */
const MAX_NOTE_LENGTH = 8000;

const PROMPT = `You are a warm, concrete journaling assistant.
Read the person's note about their day and write a short reflection on it:
what they moved forward, how the day reads overall, and one gentle
observation. Write 2-4 sentences, in the same language as the note, in the
second person ("you"). No bullet points, no headings, no lists of advice.
Return only the JSON object with the summary field.

Note:
{content}`;

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Note text is required" },
        { status: 400 },
      );
    }

    const prompt = PROMPT.replace(
      "{content}",
      content.trim().slice(0, MAX_NOTE_LENGTH),
    );

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      },
    });

    const text = response.text;

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 500 },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON response from AI" },
        { status: 500 },
      );
    }

    const summary =
      typeof parsed?.summary === "string" ? parsed.summary.trim() : "";

    if (!summary) {
      return NextResponse.json(
        { error: "Invalid response structure from AI" },
        { status: 500 },
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("AI Summarize Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "AI service not configured" },
          { status: 503 },
        );
      }
      if (error.message.includes("quota") || error.message.includes("rate")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to summarize the note. Please try again." },
      { status: 500 },
    );
  }
}
