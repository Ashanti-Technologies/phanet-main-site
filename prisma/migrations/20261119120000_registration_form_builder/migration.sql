-- Registration form builder: the hard-coded registration fields become
-- builder fields (DEFAULT_REGISTRATION_FIELDS in
-- src/lib/schemas/event-registration.schema.ts, same ids), their stored
-- values move into the answers JSON, and the old columns are dropped.

-- 1. Every event gets the default fields in front of its extra questions.
UPDATE "event"
SET "registrationFields" = '[{"id":"arrival_date","label":"Arrival date","type":"date","required":true,"scope":"booking","summary":true,"options":[]},{"id":"arrival_time","label":"Arrival time","type":"time","required":false,"scope":"booking","summary":false,"options":[]},{"id":"travel_mode","label":"Travelling by","type":"select","required":false,"scope":"booking","summary":true,"options":["Private car","Public transport","Church / organised transport","Flight","Other"]},{"id":"origin","label":"Coming from","type":"text","placeholder":"City / town","required":false,"scope":"booking","summary":false,"options":[]},{"id":"food","label":"Food preference","type":"select","required":false,"scope":"person","summary":true,"options":["No preference","Vegetarian","Vegan","Halal","No pork","Diabetic-friendly","Other (see allergies / notes)"]},{"id":"allergies","label":"Allergies","type":"text","placeholder":"e.g. peanuts, shellfish","required":false,"scope":"person","summary":true,"options":[]},{"id":"notes","label":"Notes for the organisers","type":"textarea","required":false,"scope":"booking","summary":false,"options":[]},{"id":"contact_consent","label":"PHANET may stay in touch with me after the event.","type":"checkbox","required":false,"scope":"booking","summary":false,"options":[]}]'::jsonb || COALESCE("registrationFields", '[]'::jsonb);

-- 2. Booking-level values -> event_registration.answers
UPDATE "event_registration"
SET "answers" = COALESCE("answers", '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'arrival_date', to_char("arrivalDate", 'YYYY-MM-DD'),
  'arrival_time', NULLIF("arrivalTime", ''),
  'travel_mode', CASE "travelMode"
    WHEN 'PRIVATE_CAR' THEN 'Private car'
    WHEN 'PUBLIC_TRANSPORT' THEN 'Public transport'
    WHEN 'ORGANISED_TRANSPORT' THEN 'Church / organised transport'
    WHEN 'FLIGHT' THEN 'Flight'
    WHEN 'OTHER' THEN 'Other'
  END,
  'origin', NULLIF("origin", ''),
  'notes', NULLIF("notes", ''),
  'contact_consent', "contactConsent"
));

-- 3. Person-level values -> event_attendee.answers
UPDATE "event_attendee"
SET "answers" = COALESCE("answers", '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'food', NULLIF("dietaryPreference", ''),
  'allergies', NULLIF("allergies", '')
));

-- 4. Drop the old columns
ALTER TABLE "event_registration"
  DROP COLUMN "arrivalDate",
  DROP COLUMN "arrivalTime",
  DROP COLUMN "travelMode",
  DROP COLUMN "origin",
  DROP COLUMN "notes",
  DROP COLUMN "contactConsent";

ALTER TABLE "event_attendee"
  DROP COLUMN "dietaryPreference",
  DROP COLUMN "allergies";

DROP TYPE "TravelMode";
