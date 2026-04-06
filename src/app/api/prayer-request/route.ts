import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function POST(req: Request) {
  try {
    const { content, name } = (await req.json()) as {
      content: string;
      name?: string;
    };

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    await prisma.prayerRequest.create({
      data: {
        content: content.trim().slice(0, 2000),
        name: name?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save prayer request" }, { status: 500 });
  }
}
