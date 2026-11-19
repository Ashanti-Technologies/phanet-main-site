"use client";

import { useEffect, useState } from "react";
import { searchMembersForFinance } from "@/actions/finance";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/app/components/ui/combobox";

export type MemberOption = { id: string; fullName: string; phone?: string | null };

/** Async member search on the shared Base UI combobox. */
export function MemberPicker({
  value,
  onChange,
}: {
  value: MemberOption | null;
  onChange: (member: MemberOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MemberOption[]>(value ? [value] : []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === value?.fullName) return;
    let stale = false;
    const t = setTimeout(async () => {
      const res = await searchMembersForFinance(q);
      if (!stale) setHits(res);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, value?.fullName]);

  return (
    <Combobox<MemberOption>
      items={hits}
      value={value}
      filter={null}
      itemToStringLabel={(m) => m.fullName}
      isItemEqualToValue={(a, b) => a.id === b.id}
      onInputValueChange={setQuery}
      onValueChange={(m) => onChange(m ?? null)}
    >
      <ComboboxInput className="w-full" placeholder="Search by name or phone" showClear={!!value} />
      <ComboboxContent>
        <ComboboxEmpty>
          {query.trim().length < 2 ? "Type at least 2 characters" : "No members found"}
        </ComboboxEmpty>
        <ComboboxList>
          {(m: MemberOption) => (
            <ComboboxItem key={m.id} value={m}>
              <span>{m.fullName}</span>
              {m.phone && <span className="text-xs text-muted-foreground">{m.phone}</span>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
