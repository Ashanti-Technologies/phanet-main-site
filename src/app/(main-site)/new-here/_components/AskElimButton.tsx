"use client";

/** Opens the site-wide Elim chat widget (it listens for this event). */
export default function AskElimButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("phanet:open-chat"))}
      className={className}
    >
      Ask Elim
    </button>
  );
}
