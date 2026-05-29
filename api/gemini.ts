import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

type Request = VercelRequest | any;
type Response = VercelResponse | any;

export default async function handler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "Invalid JSON body" }); }
    }
    const { contents, config, model } = body || {};

    if (!contents) return res.status(400).json({ error: "Missing contents" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server configuration error: Missing GEMINI_API_KEY (Voeg deze toe in de Vercel instellingen!)" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config
    });

    if (!response.text) throw new Error("No text received from AI");

    return res.status(200).json({ text: response.text });

  } catch (err: any) {
    console.error("Gemini Proxy Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
