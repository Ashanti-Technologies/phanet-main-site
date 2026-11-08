// Remounts on every portal navigation, so each section fades in.
export default function MemberPortalTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in duration-300">
      {children}
    </div>
  );
}
