import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CatalogsService,
  CategoryResponse,
  DistrictResponse,
} from './catalogs.service';
import {
  CategoryEnvelopeDto,
  DistrictEnvelopeDto,
} from './dto/data-envelope.dto';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';

interface CatalogEnvelope<T> {
  data: T[];
}

@ApiTags('catalogs')
@Controller()
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List active categories' })
  @ApiQuery({
    name: 'active',
    required: false,
    enum: ['true', 'false'],
    description: 'active=true accepted; active=false -> 422; malformed -> 400',
  })
  @ApiResponse({ status: 200, type: CategoryEnvelopeDto })
  @ApiResponse({ status: 400, type: ProblemDetailsDto })
  @ApiResponse({ status: 422, type: ProblemDetailsDto })
  async categories(
    @Query('active') active?: string,
  ): Promise<CatalogEnvelope<CategoryResponse>> {
    return { data: await this.catalogs.listCategories(active) };
  }

  @Get('districts')
  @ApiOperation({ summary: 'List active districts' })
  @ApiQuery({
    name: 'active',
    required: false,
    enum: ['true', 'false'],
    description: 'active=true accepted; active=false -> 422; malformed -> 400',
  })
  @ApiResponse({ status: 200, type: DistrictEnvelopeDto })
  @ApiResponse({ status: 400, type: ProblemDetailsDto })
  @ApiResponse({ status: 422, type: ProblemDetailsDto })
  async districts(
    @Query('active') active?: string,
  ): Promise<CatalogEnvelope<DistrictResponse>> {
    return { data: await this.catalogs.listDistricts(active) };
  }
}
