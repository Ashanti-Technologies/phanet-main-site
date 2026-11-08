export default function DarkDotBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950" />
      <div className="absolute inset-0 bg-[url('/images/dot-texture.svg')] bg-[length:192px_192px] bg-repeat opacity-40" />
    </div>
  );
}
