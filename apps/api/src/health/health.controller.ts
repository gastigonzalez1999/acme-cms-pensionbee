import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Health check endpoint consumed by Render's deploy health checks.
 * A 200 response tells Render the container is ready to receive traffic.
 */
@ApiTags('health')
@Controller('healthz')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
