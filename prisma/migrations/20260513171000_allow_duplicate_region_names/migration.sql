-- The imported region lookup CSV is authoritative and contains repeated
-- region names within a few countries. Keep IDs as the stable identity.
DROP INDEX IF EXISTS "region_countryId_name_key";
