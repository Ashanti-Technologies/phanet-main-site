import { prisma } from "@/lib/database";
import { Prisma } from "../src/app/generated/prisma/client";
import { getSeedEvents } from "@/lib/events";
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

  console.log("Creating CMS events...");
  const events = getSeedEvents();
  for (const event of events) {
    await prisma.event.upsert({
      where: { slug: event.slug },
      update: {
        title: event.title,
        category: event.category,
        date: new Date(event.date),
        endDate: event.endDate ? new Date(event.endDate) : null,
        time: event.time,
        location: event.location,
        address: event.address ?? null,
        description: event.description,
        bodyHtml: plainTextToHtml(event.body),
        isFeatured: !!event.isFeatured,
        registrationUrl: event.registrationUrl ?? null,
        status: "PUBLISHED",
      },
      create: {
        slug: event.slug,
        title: event.title,
        category: event.category,
        date: new Date(event.date),
        endDate: event.endDate ? new Date(event.endDate) : null,
        time: event.time,
        location: event.location,
        address: event.address ?? null,
        description: event.description,
        bodyHtml: plainTextToHtml(event.body),
        isFeatured: !!event.isFeatured,
        registrationUrl: event.registrationUrl ?? null,
        status: "PUBLISHED",
      },
    });
  }
  console.log(`✅ Created ${events.length} CMS events`);

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

  // Create sample projects
  console.log("Creating sample projects...");

  const project1 = await prisma.project.upsert({
    where: { id: "proj-001" },
    update: {},
    create: {
      id: "proj-001",
      title: "Prayer Conference 2026 - Raising One Billion Intercessors",
      description: `Join us for a transformative prayer experience that will change nations!

The Annual Phanerosis Prayer Conference brings together intercessors from across the globe for three days of intensive prayer, worship, and prophetic declarations.

Your support will help us:
• Secure a venue that seats 5,000+ attendees
• Provide live streaming to reach online participants globally
• Cover logistics for guest speakers and worship leaders
• Provide materials and resources for all attendees
• Support transportation for delegates from partner churches

Every contribution brings us closer to our vision of raising one billion intercessors worldwide. Partner with us to see this vision become reality!`,
      targetAmount: new Prisma.Decimal(150000),
      fundingMode: "MULTI_CONTRIBUTOR",
      status: "ACTIVE",
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "proj-002" },
    update: {},
    create: {
      id: "proj-002",
      title: "Prayer Mountain Retreat Center",
      description: `We are seeking a single sponsor or organization to partner with us in building a dedicated Prayer Mountain Retreat Center.

This facility will serve as:
• A 24/7 prayer watch tower
• Retreat venue for prayer schools and conferences
• Training center for intercessors
• Accommodation for visiting prayer teams

The center will be built on a 2-acre property with beautiful natural surroundings, perfect for seeking God in solitude and community.

We are looking for a kingdom-minded sponsor who shares our vision for raising intercessors across nations.`,
      targetAmount: new Prisma.Decimal(500000),
      fundingMode: "SINGLE_SPONSOR",
      status: "ACTIVE",
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: "proj-003" },
    update: {},
    create: {
      id: "proj-003",
      title: "Intercessors Training Program - 100 Nations",
      description: `Our goal is to train and equip 1,000 prayer leaders across 100 nations in the next 3 years.

This comprehensive program includes:
• 6-month intensive online training curriculum
• Physical training schools in strategic locations
• Prayer manuals and study materials in local languages
• Ongoing mentorship and support network
• Annual gathering of trained intercessors

Your contribution directly impacts the training of future prayer leaders who will raise intercessors in their nations.`,
      targetAmount: new Prisma.Decimal(75000),
      fundingMode: "MULTI_CONTRIBUTOR",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Created ${3} sample projects`);

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
