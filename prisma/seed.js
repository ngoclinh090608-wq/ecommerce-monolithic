const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const normalRole = await prisma.role.upsert({
    where: { rolename: "normal" },
    update: {},
    create: {
      rolename: "normal"
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { rolename: "admin" },
    update: {},
    create: {
      rolename: "admin"
    }
  });

  const normalMembership = await prisma.memberShip.upsert({
    where: { mid: 1 },
    update: {},
    create: {
      mid: 1,
      mname: "Normal",
      score: 10
    }
  });

  const adminPassword = await bcrypt.hash("Admin@123456", 10);

  await prisma.user.upsert({
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

  await prisma.product.createMany({
    data: [
      {
        pname: "Product X",
        price: 100000,
        quantity: 50
      },
      {
        pname: "Product Y",
        price: 200000,
        quantity: 50
      }
    ],
    skipDuplicates: true
  });

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