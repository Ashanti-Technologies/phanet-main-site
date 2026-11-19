"use client";

import { useEffect, useMemo, useState } from "react";
import { listCountries, listRegions, searchCities, type CityHit } from "@/actions/locations";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/app/components/ui/combobox";
import { Input } from "@/app/components/ui/input";

export type LocationValue = {
  countryId: string | null;
  country: string;
  regionId: string | null;
  region: string;
  cityId: string | null;
  city: string;
};

export const EMPTY_LOCATION: LocationValue = {
  countryId: null,
  country: "",
  regionId: null,
  region: "",
  cityId: null,
  city: "",
};

type Country = { id: string; name: string; code: string };
type Option = { id: string; name: string };

// Countries rarely change; load once per page.
let countriesPromise: Promise<Country[]> | null = null;
const loadCountries = () => (countriesPromise ??= listCountries());

/**
 * Country → town search (towns come with their region). "Can't find your
 * town?" falls back to a region pick + free text. Names are always filled;
 * ids only when the place came from our tables.
 */
export function LocationInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id?: string;
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  invalid?: boolean;
}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [manual, setManual] = useState(false);
  const [regions, setRegions] = useState<Option[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CityHit[]>([]);

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  // Saved answers may carry names only; default to Ghana when nothing is set.
  const country = useMemo(
    () =>
      countries.find((c) => c.id === value.countryId) ??
      countries.find((c) => c.name === (value.country || "Ghana")) ??
      null,
    [countries, value.countryId, value.country],
  );
  const cityValue: CityHit | null = value.city
    ? { id: value.cityId ?? "", name: value.city, regionId: value.regionId, regionName: value.region || null }
    : null;

  useEffect(() => {
    const q = query.trim();
    if (!country || q.length < 2 || q === value.city) return;
    let stale = false;
    const t = setTimeout(async () => {
      const res = await searchCities(country.id, q);
      if (!stale) setHits(res);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, country, value.city]);

  useEffect(() => {
    if (!manual || !country) return;
    let stale = false;
    listRegions(country.id).then((r) => !stale && setRegions(r));
    return () => {
      stale = true;
    };
  }, [manual, country]);

  const base = { countryId: country?.id ?? null, country: country?.name ?? "" };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Combobox<Country>
          items={countries}
          value={country}
          itemToStringLabel={(c) => c.name}
          isItemEqualToValue={(a, b) => a.id === b.id}
          onValueChange={(c) => {
            setHits([]);
            onChange(c ? { ...EMPTY_LOCATION, countryId: c.id, country: c.name } : EMPTY_LOCATION);
          }}
        >
          <ComboboxInput className="h-12 w-full" placeholder="Country" aria-label="Country" />
          <ComboboxContent>
            <ComboboxEmpty>No matches.</ComboboxEmpty>
            <ComboboxList>
              {(c: Country) => (
                <ComboboxItem key={c.id} value={c}>
                  {c.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {manual ? (
          <Input
            id={id}
            className="h-12"
            placeholder="Town / city"
            aria-invalid={invalid}
            value={value.city}
            onChange={(e) => onChange({ ...value, ...base, cityId: null, city: e.target.value })}
          />
        ) : (
          <Combobox<CityHit>
            items={hits}
            value={cityValue}
            filter={null}
            itemToStringLabel={(c) => c.name}
            isItemEqualToValue={(a, b) => a.id === b.id && a.name === b.name}
            onInputValueChange={setQuery}
            onValueChange={(c) =>
              onChange(
                c
                  ? { ...base, regionId: c.regionId, region: c.regionName ?? "", cityId: c.id, city: c.name }
                  : { ...EMPTY_LOCATION, ...base },
              )
            }
          >
            <ComboboxInput
              id={id}
              className="h-12 w-full"
              placeholder="Search your town or city"
              aria-invalid={invalid}
              showClear={!!value.city}
              disabled={!country}
            />
            <ComboboxContent>
              <ComboboxEmpty>
                {query.trim().length < 2 ? "Type at least 2 letters" : "Not found — use “Can't find your town?”"}
              </ComboboxEmpty>
              <ComboboxList>
                {(c: CityHit) => (
                  <ComboboxItem key={c.id} value={c}>
                    <span>{c.name}</span>
                    {c.regionName && <span className="text-xs text-muted-foreground">{c.regionName}</span>}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
      </div>

      {manual && (
        <Combobox<Option>
          items={regions}
          value={regions.find((r) => r.id === value.regionId) ?? null}
          itemToStringLabel={(r) => r.name}
          isItemEqualToValue={(a, b) => a.id === b.id}
          onValueChange={(r) => onChange({ ...value, ...base, regionId: r?.id ?? null, region: r?.name ?? "" })}
        >
          <ComboboxInput className="h-12 w-full" placeholder="Region / state" aria-label="Region or state" />
          <ComboboxContent>
            <ComboboxEmpty>No matches.</ComboboxEmpty>
            <ComboboxList>
              {(r: Option) => (
                <ComboboxItem key={r.id} value={r}>
                  {r.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}

      <button
        type="button"
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        onClick={() => {
          setManual((m) => !m);
          onChange({ ...EMPTY_LOCATION, ...base });
        }}
      >
        {manual ? "Search the list instead" : "Can't find your town?"}
      </button>
    </div>
  );
}
