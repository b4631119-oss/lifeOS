import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigError, verifyIdToken } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

// Node runtime (the default): `firebase-admin` verifies the ID token over
// Google's HTTP API and is not supported on the Edge runtime.
export const runtime = "nodejs";
/** Gemini can take a few seconds; don't let the platform cut it off at 10s. */
export const maxDuration = 30;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    subtasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  required: ["subtasks"],
};

const PROMPT = `Break down the following goal into 4-8 specific, actionable subtasks.
Each subtask should be a clear, concrete step that can be completed.
Return only the JSON object with the subtasks array.

Goal: {title}
Description: {description}`;

const RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const idToken = authHeader.slice(7);
  let uid: string;

  try {
    const decoded = await verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    // A missing/unparsable service account makes *every* token look invalid.
    // Reporting that as 401 sends the reader hunting for an auth bug, so it is
    // surfaced as a configuration failure instead.
    if (isAdminConfigError(error)) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Unauthorized: invalid or expired token" },
      { status: 401 },
    );
  }

  const rl = checkRateLimit(uid, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const { title, description } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Goal title is required" },
        { status: 400 },
      );
    }

    const prompt = PROMPT
      .replace("{title}", title.trim())
      .replace("{description}", description?.trim() || "No description provided");

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

    if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) {
      return NextResponse.json(
        { error: "Invalid response structure from AI" },
        { status: 500 },
      );
    }

    const subtasks = parsed.subtasks
      .filter((s: { title: string }) => s.title && s.title.trim())
      .slice(0, 8)
      .map((s: { title: string }) => ({ title: s.title.trim() }));

    if (subtasks.length === 0) {
      return NextResponse.json(
        { error: "No valid subtasks generated" },
        { status: 500 },
      );
    }

    return NextResponse.json({ subtasks }, {
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error("AI Decompose Error:", error);

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
      { error: "Failed to decompose goal. Please try again." },
      { status: 500 },
    );
  }
}