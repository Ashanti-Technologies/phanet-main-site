"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

/**
 * Tabs whose selection lives in `?tab=`, so refresh/share keeps your place
 * and in-page links like `?tab=rooms` switch tabs. replaceState (no server
 * round-trip); Next keeps useSearchParams in sync with it.
 */
export function EventTabs({
  tabs,
  children,
}: {
  tabs: { value: string; label: string }[];
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
      className="space-y-4"
    >
      {tabs.length > 1 && (
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      {children}
    </Tabs>
  );
}
