import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProblemDetailsDto } from './common/dto/problem-details.dto';
import { SystemStatusDto } from './common/dto/system-status.dto';

@ApiTags('system')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Root liveness check',
    description: 'Unversioned system path: GET /',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is up',
    type: SystemStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Route not found',
    type: ProblemDetailsDto,
  })
  getRoot(): { status: string } {
    return { status: 'ok' };
  }
}
