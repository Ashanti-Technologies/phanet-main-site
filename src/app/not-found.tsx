import { NotFoundGlitch } from "@/app/components/motion/not-found/glitch";

export default function NotFound() {
    return (
        <NotFoundGlitch
            className="min-h-[60vh] py-16"
            description="The page you're looking for has moved, or never existed."
            browseHref="/events"
            browseLabel="See upcoming events"
        />
    );
}
