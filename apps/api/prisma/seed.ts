type PrismaClient = import('@prisma/client').PrismaClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client') as {
  PrismaClient: new (options: { datasourceUrl: string }) => PrismaClient;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { seedCatalogs } = require('../src/database/seeds/catalog-seeder.ts') as {
  seedCatalogs: (prisma: PrismaClient) => Promise<{
    categories: number;
    districts: number;
  }>;
};

async function main(): Promise<void> {
  let prisma: PrismaClient | undefined;

  try {
    const datasourceUrl = process.env.DIRECT_URL;

    if (!datasourceUrl) {
      throw new Error('DIRECT_URL is not configured.');
    }

    prisma = new PrismaClient({ datasourceUrl });
    const counts = await seedCatalogs(prisma);

    console.log(
      `Catalog seed complete: categories=${counts.categories} districts=${counts.districts}`,
    );
  } catch {
    console.error('Catalog seed failed.');
    process.exitCode = 1;
  } finally {
    await prisma?.$disconnect();
  }
}

void main();
