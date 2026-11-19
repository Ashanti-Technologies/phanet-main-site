import { prisma } from "@/lib/database";

type LocationInput = {
  countryId?: string | null;
  regionId?: string | null;
  cityId?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

/**
 * Re-check a picked location on the server and fill the text columns from
 * the ids (admin views and exports still read `city`/`region`/`country`).
 * A city or region that doesn't belong to the country is dropped; a picked
 * city also sets the region.
 */
export async function resolveMemberLocation(input: LocationInput) {
  const [country, city, region] = await Promise.all([
    input.countryId
      ? prisma.country.findUnique({ where: { id: input.countryId }, select: { id: true, name: true } })
      : null,
    input.cityId
      ? prisma.city.findUnique({
          where: { id: input.cityId },
          select: { id: true, name: true, countryId: true, region: { select: { id: true, name: true } } },
        })
      : null,
    input.regionId
      ? prisma.region.findUnique({ where: { id: input.regionId }, select: { id: true, name: true, countryId: true } })
      : null,
  ]);
  const cityOk = country && city?.countryId === country.id ? city : null;
  const regionOk = cityOk?.region ?? (country && region?.countryId === country.id ? region : null);

  return {
    countryId: country?.id ?? null,
    country: country?.name || input.country || "Ghana",
    regionId: regionOk?.id ?? null,
    region: regionOk?.name ?? (country ? null : (input.region ?? null)),
    cityId: cityOk?.id ?? null,
    city: cityOk?.name ?? input.city ?? null,
  };
}
