import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { CONTENT_SOURCE, FileSystemContentSource } from './source';

/**
 * ContentModule wires up the content pipeline.
 *
 * The ContentSource is provided by a DI token so that:
 *   - Tests can override CONTENT_SOURCE with a mock or a fixture-backed
 *     FileSystemContentSource without touching the service or controller.
 *   - A future CMS/S3/DB backend only requires changing the factory here.
 *
 * The factory provider reads CONTENT_DIR from ConfigService (which reads
 * from process.env / .env), then instantiates FileSystemContentSource with
 * the resolved path.  FileSystemContentSource itself takes a plain string —
 * no ConfigService dependency — making it easy to test in isolation.
 */
@Module({
  controllers: [ContentController],
  providers: [
    ContentService,
    {
      provide: CONTENT_SOURCE,
      useFactory: (config: ConfigService) =>
        new FileSystemContentSource(
          config.get<string>(
            'CONTENT_DIR',
            path.join(process.cwd(), '..', '..', 'content'),
          ),
        ),
      inject: [ConfigService],
    },
  ],
})
export class ContentModule {}
