import { getLatestVideos } from "@/lib/youtube";
import LatestMessageClient from "./LatestMessageClient";

export default async function LatestMessage() {
  const videos = await getLatestVideos(5);

  if (videos.length === 0) return null;

  return (
    <LatestMessageClient
      featuredVideo={videos[0]}
      otherVideos={videos.slice(1)}
    />
  );
}
