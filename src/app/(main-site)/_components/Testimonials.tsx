import { prisma } from "@/lib/database";
import TestimonialsClient from "./TestimonialsClient";

/** Published CMS testimonials; renders nothing until at least one is published. */
export default async function Testimonials() {
  const testimonials = await prisma.testimonial.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, role: true, quote: true, imageUrl: true },
  });
  if (testimonials.length === 0) return null;
  return <TestimonialsClient testimonials={testimonials} />;
}
