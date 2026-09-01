import type {} from 'node:fs';

// Provenance: best-effort INEI reconstruction (official extract pending per BACKLOG; Callao verified vs SUNAT annex).

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

const categories = [
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
] satisfies readonly CategorySeed[];

const districts = [
  {
    ubigeo: '150101',
    name: 'Lima',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150102',
    name: 'Ancón',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150103',
    name: 'Ate',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150104',
    name: 'Barranco',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150105',
    name: 'Breña',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150106',
    name: 'Carabayllo',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150107',
    name: 'Chaclacayo',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150108',
    name: 'Chorrillos',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150109',
    name: 'Cieneguilla',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150110',
    name: 'Comas',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150111',
    name: 'El Agustino',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150112',
    name: 'Independencia',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150113',
    name: 'Jesús María',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150114',
    name: 'La Molina',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150115',
    name: 'La Victoria',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150116',
    name: 'Lince',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150117',
    name: 'Los Olivos',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150118',
    name: 'Lurigancho',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150119',
    name: 'Lurín',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150120',
    name: 'Magdalena del Mar',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150121',
    name: 'Pueblo Libre',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150122',
    name: 'Miraflores',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150123',
    name: 'Pachacámac',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150124',
    name: 'Pucusana',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150125',
    name: 'Puente Piedra',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150126',
    name: 'Punta Hermosa',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150127',
    name: 'Punta Negra',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150128',
    name: 'Rímac',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150129',
    name: 'San Bartolo',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150130',
    name: 'San Borja',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150131',
    name: 'San Isidro',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150132',
    name: 'San Juan de Lurigancho',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150133',
    name: 'San Juan de Miraflores',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150134',
    name: 'San Luis',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150135',
    name: 'San Martín de Porres',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150136',
    name: 'San Miguel',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150137',
    name: 'Santa Anita',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150138',
    name: 'Santa María del Mar',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150139',
    name: 'Santa Rosa',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150140',
    name: 'Santiago de Surco',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150141',
    name: 'Surquillo',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150142',
    name: 'Villa El Salvador',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
  {
    ubigeo: '150143',
    name: 'Villa María del Triunfo',
    province: 'Lima',
    department: 'Lima',
    active: true,
  },
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
] satisfies readonly DistrictSeed[];

module.exports = { categories, districts };
