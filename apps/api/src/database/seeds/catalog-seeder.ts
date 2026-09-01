import type {} from '@prisma/client';

type PrismaClient = import('@prisma/client').PrismaClient;

type CategorySeed = Readonly<{
  slug: string;
  name: string;
  active: true;
}>;

type DistrictSeed = Readonly<{
  ubigeo: string;
  name: string;
  province: string;
  department: string;
  active: true;
}>;

type CatalogData = {
  categories: readonly CategorySeed[];
  districts: readonly DistrictSeed[];
};

const catalogDataPath = __filename.endsWith('.ts')
  ? './catalog-data.ts'
  : './catalog-data';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { categories, districts } = require(catalogDataPath) as CatalogData;

async function seedCatalogs(
  prisma: PrismaClient,
): Promise<{ categories: number; districts: number }> {
  await prisma.$transaction(async (tx) => {
    for (const row of categories) {
      await tx.category.upsert({
        where: { slug: row.slug },
        create: row,
        update: { name: row.name, active: row.active },
      });
    }

    for (const row of districts) {
      await tx.district.upsert({
        where: { ubigeo: row.ubigeo },
        create: row,
        update: {
          name: row.name,
          province: row.province,
          department: row.department,
          active: row.active,
        },
      });
    }
  });

  return { categories: categories.length, districts: districts.length };
}

module.exports = { seedCatalogs };
