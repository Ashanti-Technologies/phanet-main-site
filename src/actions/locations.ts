"use server";

import { z } from "zod";
import { prisma } from "@/lib/database";

// Public reference data (countries, regions, GeoNames cities) for the
// location picker — no auth, read-only.

export async function listCountries() {
  return prisma.country.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

const idSchema = z.string().trim().min(1).max(64);

export async function listRegions(countryId: string) {
  const id = idSchema.safeParse(countryId);
  if (!id.success) return [];
  return prisma.region.findMany({
    where: { countryId: id.data, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type CityHit = { id: string; name: string; regionId: string | null; regionName: string | null };

export async function searchCities(countryId: string, q: string, regionId?: string | null): Promise<CityHit[]> {
  const id = idSchema.safeParse(countryId);
  const region = regionId ? idSchema.safeParse(regionId) : null;
  const query = q.trim().toLowerCase().slice(0, 80);
  if (!id.success || query.length < 2 || (region && !region.success)) return [];
  // ponytail: substring scan over one country's rows (≤ ~15k); add a pg_trgm
  // index if search ever feels slow.
  const rows = await prisma.city.findMany({
    where: {
      countryId: id.data,
      ...(region?.success ? { regionId: region.data } : {}),
      isActive: true,
      searchText: { contains: query },
    },
    orderBy: [{ population: "desc" }, { name: "asc" }],
    take: 10,
    select: { id: true, name: true, regionId: true, region: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, regionId: r.regionId, regionName: r.region?.name ?? null }));
}
