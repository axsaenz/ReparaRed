import { ApiProperty } from '@nestjs/swagger';

export class DistrictDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Opaque string identifier (UUID v4)',
  })
  id!: string;

  @ApiProperty({ example: '150101', description: 'Ubigeo code (6-digit)' })
  ubigeoCode!: string;

  @ApiProperty({ example: 'Lima', description: 'District name' })
  name!: string;

  @ApiProperty({ example: 'Lima', description: 'Province name' })
  province!: string;

  @ApiProperty({ example: 'Lima', description: 'Department name' })
  department!: string;
}
