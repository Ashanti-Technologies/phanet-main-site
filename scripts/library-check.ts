// Self-check for library access: which pages get signed URLs and when a download is offered.
// Run: pnpm tsx scripts/library-check.ts
import assert from "node:assert/strict";

process.env.CLOUDINARY_CLOUD_NAME ??= "demo";
process.env.CLOUDINARY_API_KEY ??= "key";
process.env.CLOUDINARY_API_SECRET ??= "secret";

void import("../src/lib/library").then(({ readablePages, downloadUrl, coverSrc, slugify, spineThickness }) => {

const book = {
  slug: "walking-in-light",
  pdfPublicId: "phanet/library/abc",
  pageCount: 120,
  previewPages: 10,
  downloadable: true,
  coverUrl: null,
} as const;

// FREE: every page, signed, delivered as authenticated; download offered.
const free = readablePages({ ...book, access: "FREE" });
assert.equal(free.length, 120);
assert.match(free[0], /\/image\/authenticated\/s--[\w-]{8}--\/.*pg_1/);
assert.match(free[119], /pg_120/);
assert.match(downloadUrl({ ...book, access: "FREE" })!, /\/image\/authenticated\/s--[\w-]{8}--\/fl_attachment:walking-in-light\/.*\.pdf(\?|$)/);
assert.equal(downloadUrl({ ...book, access: "FREE", downloadable: false }), null);

// PAID: only the preview pages exist as URLs, and no download before purchase.
const paid = readablePages({ ...book, access: "PAID" });
assert.equal(paid.length, 10);
assert.ok(!paid.some((u) => u.includes("pg_11")));
assert.equal(downloadUrl({ ...book, access: "PAID" }), null);
assert.equal(readablePages({ ...book, access: "PAID", previewPages: 500 }).length, 120);

// AMAZON: nothing readable, nothing downloadable.
assert.equal(readablePages({ ...book, access: "AMAZON" }).length, 0);
assert.equal(downloadUrl({ ...book, access: "AMAZON" }), null);

// Cover: explicit upload wins, else page 1 of the PDF.
assert.equal(coverSrc({ ...book, access: "FREE", coverUrl: "https://x/c.jpg" }), "https://x/c.jpg");
assert.match(coverSrc({ ...book, access: "FREE" })!, /pg_1/);
assert.equal(coverSrc({ ...book, access: "AMAZON", pdfPublicId: null }), null);

assert.equal(slugify("  The Altar & The Fire! "), "the-altar-the-fire");
assert.equal(spineThickness(null), 32);
assert.equal(spineThickness(2000), 56);

console.log("✓ library checks passed");
process.exit(0);
});
