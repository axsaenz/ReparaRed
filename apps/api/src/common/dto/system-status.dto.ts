import { ApiProperty } from '@nestjs/swagger';

export class SystemStatusDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';
}
