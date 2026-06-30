/**
 * Environment variable validation.
 *
 * @nestjs/config calls `validate()` at startup. If any required variable is
 * missing or has the wrong type, the application refuses to boot with a
 * clear error — far better than mysterious NullPointerErrors at runtime.
 *
 * Defaults here (not just in .env) ensure the application works out-of-the-
 * box in development without a .env file present.  The global gotcha to
 * remember: if you set a default only in .env, any deployment environment
 * that doesn't carry the file will silently get undefined.
 */
import { plainToInstance } from 'class-transformer';
import { IsNumber, IsOptional, IsString, validateSync } from 'class-validator';
import * as path from 'node:path';

class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  CONTENT_DIR: string = path.join(process.cwd(), '..', '..', 'content');

  @IsString()
  @IsOptional()
  TEMPLATE_PATH: string = path.join(process.cwd(), '..', '..', 'template.html');

  /**
   * Comma-separated list of allowed CORS origins.
   * Default allows the local Vite dev server.
   *
   * IMPORTANT: Update this class default when deploying — don't rely on
   * .env alone, or a missing env var will silently block the SPA.
   */
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:5173,https://acme-cms-pensionbee-web-beta.vercel.app';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
