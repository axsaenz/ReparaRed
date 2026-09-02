import { ApiProperty } from '@nestjs/swagger';
import { CategoryDto } from './category.dto';
import { DistrictDto } from './district.dto';

export class CategoryEnvelopeDto {
  @ApiProperty({
    type: [CategoryDto],
    description: 'Data envelope {data:[...]}',
  })
  data!: CategoryDto[];
}

export class DistrictEnvelopeDto {
  @ApiProperty({
    type: [DistrictDto],
    description: 'Data envelope {data:[...]}',
  })
  data!: DistrictDto[];
}
