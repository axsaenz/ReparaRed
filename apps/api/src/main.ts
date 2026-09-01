import 'reflect-metadata';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppConfigService } from './config/app-config.service';
import { createApp } from './app.factory';

export async function bootstrap(): Promise<NestFastifyApplication> {
  const app = await createApp();
  const config = app.get(AppConfigService);

  await app.listen(config.port, config.host);
  return app;
}

function reportStartupFailure(): void {
  process.exitCode = 1;
  console.error(
    'API startup aborted before listening. Check NODE_ENV, PORT, HOST, and LOG_LEVEL.',
  );
}

if (require.main === module) {
  void bootstrap().catch(() => reportStartupFailure());
}
