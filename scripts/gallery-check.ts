// Self-check for gallery access: who sees which album, and that locked covers are blurred.
// Run: pnpm tsx scripts/gallery-check.ts
import assert from "node:assert/strict";

process.env.CLOUDINARY_CLOUD_NAME ??= "demo";
process.env.CLOUDINARY_API_KEY ??= "key";
process.env.CLOUDINARY_API_SECRET ??= "secret";

void import("../src/lib/gallery").then(({ albumAccess, photoUrl }) => {
  // Drafts are invisible to everyone on the public site.
  for (const visibility of ["PUBLIC", "MEMBERS"] as const)
    for (const signedIn of [true, false]) assert.equal(albumAccess({ status: "DRAFT", visibility }, signedIn), null);

  // Published: public is open to all; members-only is open once signed in, locked otherwise.
  assert.equal(albumAccess({ status: "PUBLISHED", visibility: "PUBLIC" }, false), "open");
  assert.equal(albumAccess({ status: "PUBLISHED", visibility: "PUBLIC" }, true), "open");
  assert.equal(albumAccess({ status: "PUBLISHED", visibility: "MEMBERS" }, true), "open");
  assert.equal(albumAccess({ status: "PUBLISHED", visibility: "MEMBERS" }, false), "locked");

  // Every URL is signed and authenticated; blur is a server-side transformation.
  const clear = photoUrl("phanet/gallery/abc", 600);
  const blurred = photoUrl("phanet/gallery/abc", 400, { blur: true });
  assert.match(clear, /\/image\/authenticated\/s--[\w-]{8}--\/c_limit,f_auto,q_auto,w_600\/(v1\/)?phanet\/gallery\/abc/);
  assert.doesNotMatch(clear, /e_blur/);
  assert.match(blurred, /\/image\/authenticated\/s--[\w-]{8}--\/.*w_400\/e_blur:2000\/(v1\/)?phanet\/gallery\/abc/);

  console.log("✓ gallery checks passed");
});
