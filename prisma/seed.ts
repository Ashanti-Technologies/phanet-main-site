import { prisma } from "@/lib/database";
import { plainTextToHtml } from "@/lib/rich-text";

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user (if not exists)
  const adminEmail = "admin@phanerosisnetwork.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    console.log("Creating admin user...");
    await prisma.user.create({
      data: {
        id: "admin-001",
        email: adminEmail,
        name: "PHANET Admin",
        emailVerified: true,
        role: "admin",
      },
    });
    console.log("✅ Admin user created");
  } else {
    console.log("ℹ️ Admin user already exists");
  }

  // Create church unit options
  const churchUnits = [
    "Cell / House Fellowship",
    "Zone",
    "Media Department",
    "Choir / Music Ministry",
    "Protocol / Ushering",
    "Children's Ministry",
    "Youth Ministry",
    "Women's Ministry",
    "Men's Ministry",
    "Prayer Team",
    "Partner Church",
    "Online Fellowship",
    "Other",
  ];

  console.log("Creating church unit options...");
  for (let i = 0; i < churchUnits.length; i++) {
    await prisma.churchUnitOption.upsert({
      where: { name: churchUnits[i] },
      update: {},
      create: {
        name: churchUnits[i],
        order: i,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${churchUnits.length} church unit options`);

  console.log("Creating homepage CMS defaults...");
  const homepageDefaults = [
    {
      key: "hero",
      eyebrow: "Phanerosis Prayer Network",
      title: "Raising one billion intercessors worldwide",
      body: "PHANET exists to awaken prayer, disciple intercessors, and mobilize believers for kingdom impact across nations.",
      ctaLabel: "Join the movement",
      ctaHref: "/events",
      order: 0,
    },
    {
      key: "mission",
      eyebrow: "Our Mandate",
      title: "Prayer, transformation, and generational impact",
      body: "We gather, train, and send believers into their communities with a life of prayer and practical kingdom responsibility.",
      ctaLabel: "Learn more",
      ctaHref: "/#about",
      order: 1,
    },
  ];

  for (const section of homepageDefaults) {
    await prisma.homepageSection.upsert({
      where: { key: section.key },
      update: {
        eyebrow: section.eyebrow,
        title: section.title,
        bodyHtml: plainTextToHtml(section.body),
        ctaLabel: section.ctaLabel,
        ctaHref: section.ctaHref,
        order: section.order,
        status: "PUBLISHED",
      },
      create: {
        key: section.key,
        eyebrow: section.eyebrow,
        title: section.title,
        bodyHtml: plainTextToHtml(section.body),
        ctaLabel: section.ctaLabel,
        ctaHref: section.ctaHref,
        order: section.order,
        status: "PUBLISHED",
      },
    });
  }
  console.log(`✅ Created ${homepageDefaults.length} homepage sections`);

  console.log("\n🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
