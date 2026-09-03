import { ApiProperty } from '@nestjs/swagger';

export class OnboardClientRequestDto {
  @ApiProperty({ minLength: 2, maxLength: 100, example: 'Alex Smith' })
  name!: string;

  @ApiProperty({
    pattern: '^\\+[1-9]\\d{7,14}$',
    example: '+51987654321',
  })
  phone!: string;

  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  districtId!: string;
}
