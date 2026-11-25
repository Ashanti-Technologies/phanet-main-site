import { getAdminTestimonials } from "@/actions/cms";
import { TestimonialForm } from "./_components/testimonial-form";

export default async function AdminTestimonialsPage() {
  const testimonials = await getAdminTestimonials();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Testimonials</h1>
        <p className="text-sm text-muted-foreground">
          Published stories appear on the homepage and the New Here page, lowest
          order first. Only publish a story with the person&apos;s permission.
        </p>
      </div>
      <div className="space-y-4">
        {testimonials.map((testimonial) => (
          <TestimonialForm key={testimonial.id} testimonial={testimonial} />
        ))}
        <TestimonialForm />
      </div>
    </div>
  );
}
