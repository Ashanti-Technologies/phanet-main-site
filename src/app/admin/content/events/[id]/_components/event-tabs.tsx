"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/app/components/animate-ui/components/animate/tabs";
import { cn } from "@/lib/utils";
import { TONE_TEXT } from "@/app/admin/_components/status-badge";

export type EventTab = {
  value: string;
  label: string;
  /** Small pill after the label, e.g. a count or "3 need a room". */
  badge?: string;
  /** Draws the pill in the warning tone (something needs doing). */
  attention?: boolean;
};

/**
 * Tabs whose selection lives in `?tab=`, so refresh/share keeps your place
 * and in-page links like `?tab=rooms` switch tabs. replaceState (no server
 * round-trip); Next keeps useSearchParams in sync with it.
 */
export function EventTabs({
  tabs,
  children,
}: {
  tabs: EventTab[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("tab");
  const value = tabs.some((t) => t.value === requested) ? requested! : tabs[0].value;

  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        next.set("tab", v);
        window.history.replaceState(null, "", `${pathname}?${next}`);
      }}
      className="gap-6"
    >
      {tabs.length > 1 && (
        <TabsList className="h-10">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-3">
              {t.label}
              {t.badge && (
                <span
                  className={cn(
                    "rounded-full bg-current/15 px-1.5 py-px font-mono text-xs tabular-nums",
                    t.attention && t.value !== value && TONE_TEXT.warning,
                  )}
                >
                  {t.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      <TabsContents>{children}</TabsContents>
    </Tabs>
  );
}
