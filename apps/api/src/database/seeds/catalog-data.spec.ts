import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as catalogData from './catalog-data';

type CategorySeed = {
  slug: string;
  name: string;
  active: boolean;
};

type DistrictSeed = {
  ubigeo: string;
  name: string;
  province: string;
  department: string;
  active: boolean;
};

const { categories, districts } = catalogData as unknown as {
  categories: readonly CategorySeed[];
  districts: readonly DistrictSeed[];
};

describe('catalog seed data', () => {
  it('contains the four locked category pairs in the supplied order', () => {
    expect(categories).toEqual([
      {
        slug: 'gasfiteria-y-tuberias',
        name: 'Gasfitería y tuberías',
        active: true,
      },
      {
        slug: 'electricidad-basica',
        name: 'Electricidad básica',
        active: true,
      },
      {
        slug: 'reparacion-de-muebles',
        name: 'Reparación de muebles',
        active: true,
      },
      {
        slug: 'limpieza-especializada',
        name: 'Limpieza especializada',
        active: true,
      },
    ]);
    expect(new Set(categories.map((category) => category.slug)).size).toBe(4);
  });

  it('contains all 43 Lima districts in code order', () => {
    expect(districts.slice(0, 43).map((district) => district.name)).toEqual([
      'Lima',
      'Ancón',
      'Ate',
      'Barranco',
      'Breña',
      'Carabayllo',
      'Chaclacayo',
      'Chorrillos',
      'Cieneguilla',
      'Comas',
      'El Agustino',
      'Independencia',
      'Jesús María',
      'La Molina',
      'La Victoria',
      'Lince',
      'Los Olivos',
      'Lurigancho',
      'Lurín',
      'Magdalena del Mar',
      'Pueblo Libre',
      'Miraflores',
      'Pachacámac',
      'Pucusana',
      'Puente Piedra',
      'Punta Hermosa',
      'Punta Negra',
      'Rímac',
      'San Bartolo',
      'San Borja',
      'San Isidro',
      'San Juan de Lurigancho',
      'San Juan de Miraflores',
      'San Luis',
      'San Martín de Porres',
      'San Miguel',
      'Santa Anita',
      'Santa María del Mar',
      'Santa Rosa',
      'Santiago de Surco',
      'Surquillo',
      'Villa El Salvador',
      'Villa María del Triunfo',
    ]);
  });

  it('contains 50 unique active districts in the two locked regions', () => {
    expect(districts).toHaveLength(50);
    expect(new Set(districts.map((district) => district.ubigeo)).size).toBe(50);
    expect(districts.every((district) => district.active)).toBe(true);

    const lima = districts.slice(0, 43);
    const callao = districts.slice(43);

    expect(lima.map((district) => district.ubigeo)).toEqual(
      Array.from(
        { length: 43 },
        (_, index) => `150${String(index + 101).padStart(3, '0')}`,
      ),
    );
    expect(callao.map((district) => district.ubigeo)).toEqual([
      '070101',
      '070102',
      '070103',
      '070104',
      '070105',
      '070106',
      '070107',
    ]);
    expect(lima.every((district) => district.province === 'Lima')).toBe(true);
    expect(lima.every((district) => district.department === 'Lima')).toBe(true);
  });

  it('keeps the verified Callao names and region fields', () => {
    expect(districts.slice(43)).toEqual([
      {
        ubigeo: '070101',
        name: 'Callao',
        province: 'Callao',
        department: 'Callao',
        active: true,
      },
      {
        ubigeo: '070102',
        name: 'Bellavista',
        province: 'Callao',
        department: 'Callao',
        active: true,
      },
      {
        ubigeo: '070103',
        name: 'Carmen de la Legua',
        province: 'Callao',
        department: 'Callao',
        active: true,
      },
      {
        ubigeo: '070104',
        name: 'La Perla',
        province: 'Callao',
        department: 'Callao',
        active: true,
      },
      {
        ubigeo: '070105',
        name: 'La Punta',
        province: 'Callao',
        department: 'Callao',
        active: true,
      },
      {
        ubigeo: '070106',
        name: 'Ventanilla',
        province: 'Callao',
        department: 'Callao',
        active: true,
      },
      {
        ubigeo: '070107',
        name: 'Mi Perú',
        province: 'Callao',
        department: 'Callao',
        active: true,
      },
    ]);
  });

  it('records the required best-effort provenance in the source', () => {
    const source = readFileSync(resolve(__dirname, 'catalog-data.ts'), 'utf8');

    expect(source).toContain(
      'best-effort INEI reconstruction (official extract pending per BACKLOG; Callao verified vs SUNAT annex)',
    );
  });
});
