import { NextResponse } from "next/server";
import { getVideosPage } from "@/lib/youtube";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const maxResults = Math.min(
    parseInt(searchParams.get("maxResults") ?? "12", 10),
    50
  );

  const data = await getVideosPage(pageToken, maxResults);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
