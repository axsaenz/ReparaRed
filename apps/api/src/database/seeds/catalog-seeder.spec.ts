import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import * as catalogData from './catalog-data';
import * as seeder from './catalog-seeder';

type UpsertArgs = {
  where: Record<string, string>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type StoredRow = Record<string, unknown> & { id: string };

type FakeTransaction = {
  category: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  district: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

const { categories, districts } = catalogData as unknown as {
  categories: readonly Record<string, unknown>[];
  districts: readonly Record<string, unknown>[];
};
const { seedCatalogs } = seeder as unknown as {
  seedCatalogs: (prisma: PrismaClient) => Promise<{
    categories: number;
    districts: number;
  }>;
};

function createFakeClient(): {
  client: PrismaClient;
  transaction: ReturnType<typeof vi.fn>;
  categoryRows: Map<string, StoredRow>;
  districtRows: Map<string, StoredRow>;
  tx: FakeTransaction;
} {
  const categoryRows = new Map<string, StoredRow>();
  const districtRows = new Map<string, StoredRow>();
  const tx: FakeTransaction = {
    category: {
      upsert: vi.fn(async (args: UpsertArgs) => {
        const key = args.where.slug;
        if (!key) {
          throw new Error('missing category key');
        }
        const existing = categoryRows.get(key);
        const row = existing
          ? { ...existing, ...args.update }
          : { id: `category-${key}`, ...args.create };
        categoryRows.set(key, row as StoredRow);
        return row;
      }),
      deleteMany: vi.fn(),
    },
    district: {
      upsert: vi.fn(async (args: UpsertArgs) => {
        const key = args.where.ubigeo;
        if (!key) {
          throw new Error('missing district key');
        }
        const existing = districtRows.get(key);
        const row = existing
          ? { ...existing, ...args.update }
          : { id: `district-${key}`, ...args.create };
        districtRows.set(key, row as StoredRow);
        return row;
      }),
      deleteMany: vi.fn(),
    },
  };
  const transaction = vi.fn(
    async (callback: (transaction: FakeTransaction) => Promise<void>) =>
      callback(tx),
  );

  return {
    client: { $transaction: transaction } as unknown as PrismaClient,
    transaction,
    categoryRows,
    districtRows,
    tx,
  };
}

describe('seedCatalogs', () => {
  it('runs every upsert in one transaction with stable natural keys', async () => {
    const fake = createFakeClient();

    await expect(seedCatalogs(fake.client)).resolves.toEqual({
      categories: 4,
      districts: 50,
    });

    expect(fake.transaction).toHaveBeenCalledTimes(1);
    expect(fake.tx.category.upsert).toHaveBeenCalledTimes(categories.length);
    expect(fake.tx.district.upsert).toHaveBeenCalledTimes(districts.length);
    expect(fake.tx.category.upsert.mock.calls[0][0]).toMatchObject({
      where: { slug: 'gasfiteria-y-tuberias' },
      update: { name: 'Gasfitería y tuberías', active: true },
    });
    expect(fake.tx.district.upsert.mock.calls[0][0]).toMatchObject({
      where: { ubigeo: '150101' },
      update: {
        name: 'Lima',
        province: 'Lima',
        department: 'Lima',
        active: true,
      },
    });
  });

  it('preserves IDs, reactivates corrected rows, and converges on a second run', async () => {
    const fake = createFakeClient();
    fake.categoryRows.set('gasfiteria-y-tuberias', {
      id: 'existing-category-id',
      slug: 'gasfiteria-y-tuberias',
      name: 'Old category',
      active: false,
    });
    fake.districtRows.set('150101', {
      id: 'existing-district-id',
      ubigeo: '150101',
      name: 'Old district',
      province: 'Old province',
      department: 'Old department',
      active: false,
    });

    await seedCatalogs(fake.client);
    const firstCategory = { ...fake.categoryRows.get('gasfiteria-y-tuberias') };
    const firstDistrict = { ...fake.districtRows.get('150101') };
    await seedCatalogs(fake.client);

    expect(fake.transaction).toHaveBeenCalledTimes(2);
    expect(fake.categoryRows.get('gasfiteria-y-tuberias')).toEqual(
      firstCategory,
    );
    expect(fake.districtRows.get('150101')).toEqual(firstDistrict);
    expect(fake.categoryRows.get('gasfiteria-y-tuberias')).toMatchObject({
      id: 'existing-category-id',
      name: 'Gasfitería y tuberías',
      active: true,
    });
    expect(fake.districtRows.get('150101')).toMatchObject({
      id: 'existing-district-id',
      name: 'Lima',
      province: 'Lima',
      department: 'Lima',
      active: true,
    });
  });

  it('never calls destructive cleanup operations', async () => {
    const fake = createFakeClient();

    await seedCatalogs(fake.client);

    expect(fake.tx.category.deleteMany).not.toHaveBeenCalled();
    expect(fake.tx.district.deleteMany).not.toHaveBeenCalled();
  });

  it('does not return counts when the transaction fails', async () => {
    const transaction = vi
      .fn()
      .mockRejectedValue(new Error('transaction failed'));
    const client = { $transaction: transaction } as unknown as PrismaClient;

    await expect(seedCatalogs(client)).rejects.toThrow('transaction failed');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
