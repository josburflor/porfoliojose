import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function askZenith(prompt: string, history: ChatMessage[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: "You are Zenith AI, a precise, technical, and helpful productivity assistant. Your tone is professional and concise. Favor tabular data and lists when appropriate.",
        temperature: 0.7,
      }
    });

    return response.text || "I couldn't process that request.";
  } catch (error) {
    console.error("Zenith AI Error:", error);
    return "Error: " + (error instanceof Error ? error.message : "Internal AI Error");
  }
}
