export type YoutubeVideo = {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  videoUrl: string;
};

export type VideosPage = {
  videos: YoutubeVideo[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults: number;
};

const CHANNEL_ID = "UCdELEZVm0jBWivOyKZyaFoA";
const UPLOADS_PLAYLIST_ID = "UUdELEZVm0jBWivOyKZyaFoA";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

/** Used on the landing page — no API key needed, returns latest 15 max. */
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
        title: decodeEntities(title),
        publishedAt: formatDate(published),
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
  } catch {
    return [];
  }
}

type PlaylistItemsResponse = {
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo?: { totalResults: number };
  items?: Array<{
    snippet: {
      title: string;
      publishedAt: string;
      resourceId: { videoId: string };
      thumbnails?: {
        maxres?: { url: string };
        high?: { url: string };
        medium?: { url: string };
      };
    };
  }>;
};

/** Used on the Messages page — requires YOUTUBE_API_KEY, supports full pagination. */
export async function getVideosPage(
  pageToken?: string,
  maxResults = 12
): Promise<VideosPage> {
  try {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: UPLOADS_PLAYLIST_ID,
      maxResults: String(maxResults),
      key: process.env.YOUTUBE_API_KEY ?? "",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      const errBody = await res.text();
      console.error("[YouTube API] HTTP", res.status, errBody);
      return { videos: [], totalResults: 0 };
    }

    const data = (await res.json()) as PlaylistItemsResponse;

    const videos: YoutubeVideo[] = (data.items ?? [])
      .filter((item) => !!item.snippet.resourceId.videoId)
      .map((item) => {
        const { snippet } = item;
        const videoId = snippet.resourceId.videoId;
        const thumbnailUrl =
          snippet.thumbnails?.maxres?.url ??
          snippet.thumbnails?.high?.url ??
          snippet.thumbnails?.medium?.url ??
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        return {
          id: videoId,
          title: decodeEntities(snippet.title),
          publishedAt: formatDate(snippet.publishedAt),
          thumbnailUrl,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      });

    return {
      videos,
      nextPageToken: data.nextPageToken,
      prevPageToken: data.prevPageToken,
      totalResults: data.pageInfo?.totalResults ?? 0,
    };
  } catch (err) {
    console.error("[YouTube API] Unexpected error:", err);
    return { videos: [], totalResults: 0 };
  }
}
