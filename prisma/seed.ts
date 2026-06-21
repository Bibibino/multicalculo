import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../apps/api/src/auth.js";

const prisma = new PrismaClient();

const carriers = [
  { slug: "carrier-a", name: "Carrier A", adapterVersion: "0.1.0-mock" },
  { slug: "carrier-b", name: "Carrier B", adapterVersion: "0.1.0-mock" },
  { slug: "carrier-c", name: "Carrier C", adapterVersion: "0.1.0-mock" }
] as const;

const main = async (): Promise<void> => {
  await Promise.all(
    carriers.map((carrier) =>
      prisma.carrier.upsert({
        where: { slug: carrier.slug },
        update: {
          name: carrier.name,
          enabled: true,
          adapterVersion: carrier.adapterVersion
        },
        create: {
          slug: carrier.slug,
          name: carrier.name,
          enabled: true,
          adapterVersion: carrier.adapterVersion
        }
      })
    )
  );

  await prisma.user.upsert({
    where: { email: "operador@corretora.test" },
    update: {
      name: "Operador Dev",
      active: true,
      role: "OPERATOR"
    },
    create: {
      name: "Operador Dev",
      email: "operador@corretora.test",
      passwordHash: await hashPassword("dev-password"),
      role: "OPERATOR",
      active: true
    }
  });
};

try {
  await main();
} finally {
  await prisma.$disconnect();
}
