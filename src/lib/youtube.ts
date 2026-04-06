export type YoutubeVideo = {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  videoUrl: string;
};

const CHANNEL_ID = "UCdELEZVm0jBWivOyKZyaFoA";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function getLatestVideos(count = 5): Promise<YoutubeVideo[]> {
  try {
    const res = await fetch(RSS_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const xml = await res.text();

    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g);
    if (!entries) return [];

    return entries.slice(0, count).map((entry) => {
      const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) ?? [])[1] ?? "";
      const title = (entry.match(/<title>([^<]+)<\/title>/) ?? [])[1] ?? "";
      const published = (entry.match(/<published>([^<]+)<\/published>/) ?? [])[1] ?? "";

      return {
        id: videoId,
        title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        publishedAt: formatDate(published),
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
  } catch {
    return [];
  }
}
