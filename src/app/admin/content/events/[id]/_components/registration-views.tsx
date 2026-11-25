"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Tabs,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/app/components/animate-ui/components/animate/tabs";

/**
 * Registered / In progress / Awaiting payment switch inside the Registrations
 * tab. The tables keep their search/sort/page in the URL, so switching resets
 * those (one table's sort column means nothing to the other).
 */
export function RegistrationViews({
  views,
  children,
}: {
  views: { value: string; label: string; count: number }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [value, setValue] = useState(views[0].value);
  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        setValue(v);
        window.history.replaceState(null, "", `${pathname}?tab=registrations`);
      }}
      className="gap-4"
    >
      {views.length > 1 && (
        <div className="-mx-1 max-w-full overflow-x-auto px-1">
          <TabsList className="h-10">
            {views.map((v) => (
              <TabsTrigger key={v.value} value={v.value} className="px-4 whitespace-nowrap">
                {v.label}
                <span className="rounded-full bg-current/15 px-1.5 py-px font-mono text-xs tabular-nums">
                  {v.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      )}
      <TabsContents>{children}</TabsContents>
    </Tabs>
  );
}
