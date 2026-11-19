-- Fields seeded by 20261119120000_registration_form_builder predate the inPersonOnly flag,
-- so online attendees were asked travel/food questions. Flag them as DEFAULT_REGISTRATION_FIELDS does.
-- Only fields with no inPersonOnly key are touched, so an admin's explicit choice is kept.
UPDATE "event"
SET "registrationFields" = (
  SELECT jsonb_agg(
    CASE
      WHEN f->>'id' IN ('arrival_date', 'arrival_time', 'travel_mode', 'food', 'allergies')
       AND NOT f ? 'inPersonOnly'
      THEN f || '{"inPersonOnly": true}'::jsonb
      ELSE f
    END ORDER BY i)
  FROM jsonb_array_elements("registrationFields") WITH ORDINALITY AS t(f, i)
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements("registrationFields") f
  WHERE f->>'id' IN ('arrival_date', 'arrival_time', 'travel_mode', 'food', 'allergies')
    AND NOT f ? 'inPersonOnly'
);
