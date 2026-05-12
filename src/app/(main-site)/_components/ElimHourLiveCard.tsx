import Link from "next/link";
import { getNextElimHour, buildIcsForEvent } from "@/lib/events";
import Countdown from "./Countdown";

function formatNextLabel(date: Date): string {
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${formatted} · ${time} GMT`;
}

export default function ElimHourLiveCard() {
  const { date, event } = getNextElimHour();
  const ics = buildIcsForEvent(event, date);
  const icsDataUrl = `data:text/calendar;charset=utf-8;base64,${Buffer.from(ics).toString("base64")}`;

  return (
    <div className="bg-crayola col-span-2 rounded-2xl p-8 flex flex-col justify-between min-h-[320px] lg:min-h-[380px]">
      <div>
        <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">
          Next service · {formatNextLabel(date)}
        </span>
        <h3 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4">
          Elim Hour
        </h3>
        <p className="text-white/90 text-base mb-6">
          Our weekly online gathering. Worship together, hear the Word, and
          stand in the gap with intercessors from across the world.
        </p>
        <Countdown targetIso={date.toISOString()} />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href="/messages"
          className="px-5 py-2.5 rounded-full font-medium text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          Watch live
        </Link>
        <a
          href={icsDataUrl}
          download="elim-hour.ics"
          className="px-5 py-2.5 rounded-full font-medium text-sm bg-transparent text-white border-2 border-white hover:bg-white/10 transition-colors"
        >
          Add to calendar
        </a>
      </div>
    </div>
  );
}
