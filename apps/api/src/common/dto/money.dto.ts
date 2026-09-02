import { ApiProperty } from '@nestjs/swagger';

export class MoneyDto {
  @ApiProperty({
    example: '125.50',
    description: 'Decimal amount as string (two fractional digits)',
    pattern: '^\\d+\\.\\d{2}$',
  })
  amount!: string;

  @ApiProperty({
    example: 'PEN',
    enum: ['PEN'],
    description: 'ISO 4217 currency code',
  })
  currency!: string;
}
