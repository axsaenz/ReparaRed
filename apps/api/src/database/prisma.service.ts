import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    const databaseUrl = config.databaseUrl;
    super(databaseUrl ? { datasourceUrl: databaseUrl } : {});
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.$disconnect();
    } catch {
      this.logger.warn('Prisma client shutdown failed.');
    }
  }
}
