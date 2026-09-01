import { Controller, Get, Query } from '@nestjs/common';
import {
  CatalogsService,
  CategoryResponse,
  DistrictResponse,
} from './catalogs.service';

interface CatalogEnvelope<T> {
  data: T[];
}

@Controller()
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get('categories')
  async categories(
    @Query('active') active?: string,
  ): Promise<CatalogEnvelope<CategoryResponse>> {
    return { data: await this.catalogs.listCategories(active) };
  }

  @Get('districts')
  async districts(
    @Query('active') active?: string,
  ): Promise<CatalogEnvelope<DistrictResponse>> {
    return { data: await this.catalogs.listDistricts(active) };
  }
}
