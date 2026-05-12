import "dotenv/config";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "PHANET Admin";

  if (!email || !password) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required."
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    });

    await prisma.user.update({
      where: { id: result.user.id },
      data: { role: "admin", emailVerified: true },
    });

    console.log(`Created admin user: ${email}`);
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: { role: "admin", emailVerified: true, name },
  });

  const credentialAccount = await prisma.account.findFirst({
    where: { userId: existing.id, providerId: "credential" },
  });

  const passwordHash = await hashPassword(password);

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: existing.id,
        accountId: existing.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  console.log(`Updated admin credentials: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
