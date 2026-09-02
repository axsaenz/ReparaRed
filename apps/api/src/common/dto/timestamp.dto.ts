import { ApiProperty } from '@nestjs/swagger';

export class TimestampDto {
  @ApiProperty({
    format: 'date-time',
    example: '2026-01-15T12:30:00.000Z',
    description: 'RFC 3339 timestamp',
  })
  value!: string;
}
