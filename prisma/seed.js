const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // Serialize seed runs without adding uniqueness rules to product names.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734821)`;
    await tx.role.upsert({
      where: { rolename: "normal" },
      update: {},
      create: {
        rolename: "normal"
      }
    });

    const adminRole = await tx.role.upsert({
      where: { rolename: "admin" },
      update: {},
      create: {
        rolename: "admin"
      }
    });

    const normalMembership = await tx.memberShip.findFirst({
      where: { score: 10 },
      orderBy: { mid: "asc" }
    }) || await tx.memberShip.create({
      data: { mname: "Normal", score: 10 }
    });

    const adminPassword = await bcrypt.hash("Admin@123456", 10);

    await tx.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        fullname: "System Admin",
        password: adminPassword,
        roleid: adminRole.roleid,
        mid: normalMembership.mid
      }
    });

    for (const product of [
      { pname: "Product X", price: 100000, quantity: 50 },
      { pname: "Product Y", price: 200000, quantity: 50 }
    ]) {
      const existing = await tx.product.findFirst({ where: { pname: product.pname } });
      if (!existing) await tx.product.create({ data: product });
    }
  }, { timeout: 15000 });

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });