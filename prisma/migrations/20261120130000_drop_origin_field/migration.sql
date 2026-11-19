-- The "Coming from" (origin) question seeded by 20261119120000_registration_form_builder
-- is superseded by the per-attendee location picker. Remove it from events that still have it.
UPDATE "event"
SET "registrationFields" = COALESCE(
  (SELECT jsonb_agg(f ORDER BY i)
   FROM jsonb_array_elements("registrationFields") WITH ORDINALITY AS t(f, i)
   WHERE f->>'id' <> 'origin'),
  '[]'::jsonb
)
WHERE "registrationFields" @> '[{"id":"origin"}]';
