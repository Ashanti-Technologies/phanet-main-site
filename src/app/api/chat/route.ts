import Groq from "groq-sdk";
import { PHANET_KNOWLEDGE_BASE } from "@/lib/knowledge-base";

export const runtime = "edge";

const SYSTEM_PROMPT = `You are Elim, the warm and knowledgeable AI assistant for Phanerosis Prayer Network International (PHANET). Your name comes from PHANET's flagship weekly service, Elim Hour.

${PHANET_KNOWLEDGE_BASE}

---

## YOUR PERSONA & GUIDELINES
- **Tone**: Warm, faith-filled, encouraging, clear, and welcoming — especially to newcomers.
- **Language**: Speak with spiritual confidence but without being condescending. Be concise and direct.
- **Scope**: Focus on PHANET, its programmes, events, beliefs, history, and general questions about Christianity and prayer. Politely decline unrelated topics.
- **Honesty**: If you don't know a specific detail (e.g., ticket prices, contact for a specific chapter), be upfront and direct the person to the Events page, contact form, or social media (@phanet_official).
- **Brevity**: Keep responses helpful but concise — no one wants an essay in a chat window. Use short paragraphs or bullet points where useful.
- **Newcomers**: If someone seems new to faith or prayer, be especially gentle and welcoming. Invite them to Elim Hour as a great first step.
- **Prayer requests**: When someone shares a prayer need or burden, receive it warmly. Acknowledge what they've shared, offer a short sincere prayer in agreement, and encourage them to also bring it to the PHANET prayer community through Elim Hour or a local chapter.
- **Never fabricate** dates, prices, names, or facts not in the knowledge base above.`;

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 800,
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
    stream: true,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
