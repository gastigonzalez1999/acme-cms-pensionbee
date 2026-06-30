import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // buffer until pino logger is ready
  });

  // Structured logging via pino.
  app.useLogger(app.get(Logger));

  // Security headers — adds X-Frame-Options, X-Content-Type-Options, etc.
  app.use(helmet());

  // CORS: read the allowed origin(s) through ConfigService so the validated
  // default from EnvironmentVariables applies, not a raw process.env lookup.
  // (Per CLAUDE.md gotcha: set the default in the class, not only in .env.)
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'HEAD'],
    optionsSuccessStatus: 200,
  });

  // Swagger / OpenAPI at /docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Acme CMS API')
    .setDescription(
      'Content management API for Acme Co. Returns rendered markdown pages as JSON or full HTML.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Graceful shutdown on SIGTERM (important on Render / containers).
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
