import { writeFileSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import SwaggerParser from '@apidevtools/swagger-parser';
import { createAppForExport } from '../dist/app.factory.js';

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortKeys(entry)]),
    );
  }

  return value;
}

async function main() {
  let app;
  try {
    app = await createAppForExport();
    await app.init();
    const config = new DocumentBuilder()
      .setTitle('ReparaRed API')
      .setVersion('1.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [
        (await import('../dist/common/dto/money.dto.js')).MoneyDto,
        (await import('../dist/common/dto/pagination.dto.js'))
          .PaginationQueryDto,
        (await import('../dist/common/dto/timestamp.dto.js')).TimestampDto,
      ],
    });
    await SwaggerParser.validate(document);
    const stable = `${JSON.stringify(sortKeys(document), null, 2)}\n`;
    const outputPath =
      globalThis.process.env.OPENAPI_OUTPUT_PATH ??
      fileURLToPath(new URL('../openapi.json', import.meta.url));
    writeFileSync(outputPath, stable, 'utf8');
    globalThis.console.log('openapi.json written');
  } finally {
    await app?.close();
  }
}

main().catch((e) => {
  globalThis.console.error(e);
  globalThis.process.exit(1);
});
