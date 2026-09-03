import { ApiProperty } from '@nestjs/swagger';

export class ClientProfileResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ pattern: '^\\+[1-9]\\d{7,14}$' })
  phone!: string;

  @ApiProperty({ format: 'uuid' })
  districtId!: string;
}

export class ClientOnboardingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['CLIENT'] })
  role!: 'CLIENT';

  @ApiProperty({ type: ClientProfileResponseDto })
  profile!: ClientProfileResponseDto;
}
