import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import { ClientOnboardingResponseDto } from './dto/client-onboarding.response.dto';
import { OnboardClientRequestDto } from './dto/onboard-client.request.dto';
import { RegistrationService } from './registration.service';

@ApiTags('onboarding')
@Controller('onboarding')
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Post('client')
  @ApiOperation({ summary: 'Onboard a verified client' })
  @ApiBody({ type: OnboardClientRequestDto })
  @ApiResponse({ status: 201, type: ClientOnboardingResponseDto })
  @ApiResponse({ status: 200, type: ClientOnboardingResponseDto })
  @ApiResponse({ status: 400, type: ProblemDetailsDto })
  @ApiResponse({ status: 401, type: ProblemDetailsDto })
  @ApiResponse({ status: 409, type: ProblemDetailsDto })
  @ApiResponse({ status: 422, type: ProblemDetailsDto })
  @ApiResponse({ status: 500, type: ProblemDetailsDto })
  async onboardClient(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<ClientOnboardingResponseDto> {
    const result = await this.registration.onboard(body);
    response.status(result.status);
    return result.body;
  }
}
