import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Opaque string identifier (UUID v4)',
  })
  id!: string;

  @ApiProperty({
    example: 'gasfiteria-y-tuberias',
    description: 'URL-safe slug preserving original casing semantics',
  })
  slug!: string;

  @ApiProperty({
    example: 'Gasfiteria y tuberias',
    description: 'Display name',
  })
  name!: string;
}
