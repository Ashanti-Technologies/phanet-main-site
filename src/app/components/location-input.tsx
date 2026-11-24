"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { listCountries, listRegions, searchCities, type CityHit } from "@/actions/locations";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/app/components/ui/combobox";
import { Label } from "@/app/components/ui/label";

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
/** Picked when someone's region isn't in our list, so they can still enter their town. */
const REGION_NOT_LISTED: Option = { id: "__not_listed__", name: "My region isn't listed" };
/** A search hit, or (typed) the town exactly as the person wrote it. */
type CityOption = CityHit & { typed?: boolean };

// Reference data rarely changes; load once per page.
let countriesPromise: Promise<Country[]> | null = null;
const loadCountries = () => (countriesPromise ??= listCountries());
const regionCache = new Map<string, Promise<Option[]>>();
const loadRegions = (countryId: string) => {
  if (!regionCache.has(countryId)) regionCache.set(countryId, listRegions(countryId));
  return regionCache.get(countryId)!;
};

/**
 * Country (Ghana by default) → Region / State → Town / City, in that order,
 * with a line underneath confirming exactly what will be saved. A town that
 * isn't in our list can still be used as typed; scripts/unmatched-towns.ts
 * lists those so we can add them.
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
  const [regions, setRegions] = useState<{ countryId: string; list: Option[] } | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CityHit[]>([]);
  const [regionNotListed, setRegionNotListed] = useState(false);

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

  useEffect(() => {
    if (!country) return;
    let stale = false;
    loadRegions(country.id).then((list) => !stale && setRegions({ countryId: country.id, list }));
    return () => {
      stale = true;
    };
  }, [country]);

  const regionList = regions && regions.countryId === country?.id ? regions.list : null; // null = loading
  const hasRegions = !!regionList?.length;
  const region =
    regionList?.find((r) => r.id === value.regionId) ??
    regionList?.find((r) => r.name === value.region) ??
    null;
  const cityReady = !!country && regionList !== null && (!hasRegions || !!region || regionNotListed);

  useEffect(() => {
    const q = query.trim();
    if (!country || !cityReady || q.length < 2 || q === value.city) return;
    let stale = false;
    const t = setTimeout(async () => {
      const res = await searchCities(country.id, q, region?.id);
      if (!stale) setHits(res);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, country, region?.id, cityReady, value.city]);

  const typed = query.trim();
  const cityItems: CityOption[] =
    typed.length >= 2 && typed !== value.city && !hits.some((h) => h.name.toLowerCase() === typed.toLowerCase())
      ? [...hits, { id: `typed:${typed}`, name: typed, regionId: region?.id ?? null, regionName: region?.name ?? null, typed: true }]
      : hits;
  const cityValue: CityOption | null = value.city
    ? { id: value.cityId ?? `typed:${value.city}`, name: value.city, regionId: value.regionId, regionName: value.region || null }
    : null;

  const base = {
    countryId: country?.id ?? null,
    country: country?.name ?? "",
    regionId: region?.id ?? null,
    region: region?.name ?? "",
  };
  const summary = [value.city, region?.name ?? value.region, country?.name].filter(Boolean).join(", ");

  return (
    <div className="space-y-2">
      <div className={`grid gap-3 ${hasRegions || regionList === null ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Country</Label>
          <Combobox<Country>
            items={countries}
            value={country}
            itemToStringLabel={(c) => c.name}
            isItemEqualToValue={(a, b) => a.id === b.id}
            onValueChange={(c) => {
              setHits([]);
              setRegionNotListed(false);
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
        </div>

        {(hasRegions || regionList === null) && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Region / State</Label>
            <Combobox<Option>
              items={regionList ? [...regionList, REGION_NOT_LISTED] : []}
              value={region ?? (regionNotListed ? REGION_NOT_LISTED : null)}
              itemToStringLabel={(r) => r.name}
              isItemEqualToValue={(a, b) => a.id === b.id}
              onValueChange={(r) => {
                setHits([]);
                const notListed = r?.id === REGION_NOT_LISTED.id;
                setRegionNotListed(notListed);
                const picked = r && !notListed ? r : null;
                onChange({ ...EMPTY_LOCATION, ...base, regionId: picked?.id ?? null, region: picked?.name ?? "" });
              }}
            >
              <ComboboxInput
                className="h-12 w-full"
                placeholder={regionList === null ? "Loading…" : "Pick a region"}
                aria-label="Region or state"
                disabled={!regionList}
              />
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
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs text-muted-foreground">
            Town / City
          </Label>
          <Combobox<CityOption>
            items={cityItems}
            value={cityValue}
            filter={null}
            itemToStringLabel={(c) => c.name}
            isItemEqualToValue={(a, b) => a.id === b.id}
            onInputValueChange={setQuery}
            onValueChange={(c) =>
              onChange(
                c
                  ? { ...base, cityId: c.typed ? null : c.id, city: c.name }
                  : { ...EMPTY_LOCATION, ...base },
              )
            }
          >
            <ComboboxInput
              id={id}
              className="h-12 w-full"
              placeholder={cityReady ? "Just the town, e.g. Teshie" : "Pick a region first"}
              aria-invalid={invalid}
              showClear={!!value.city}
              disabled={!cityReady}
            />
            <ComboboxContent>
              <ComboboxEmpty>Type at least 2 letters</ComboboxEmpty>
              <ComboboxList>
                {(c: CityOption) => (
                  <ComboboxItem key={c.id} value={c}>
                    {c.typed ? (
                      <span>
                        Use &ldquo;{c.name}&rdquo;{" "}
                        <span className="text-xs text-muted-foreground">(not in our list yet)</span>
                      </span>
                    ) : (
                      <span>{c.name}</span>
                    )}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>

      {(typed.includes(",") || value.city.includes(",")) && (
        <p className="text-xs text-amber-700 dark:text-amber-400" aria-live="polite">
          Just one town, please, e.g. &ldquo;Teshie&rdquo; rather than &ldquo;Accra, Teshie&rdquo;.
        </p>
      )}

      {value.city && (
        <p className="flex items-center gap-1.5 text-sm" aria-live="polite">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="font-medium">{summary}</span>
          {!value.cityId && (
            <span className="text-xs text-muted-foreground">(new town, we&apos;ll add it to our list)</span>
          )}
        </p>
      )}
    </div>
  );
}
