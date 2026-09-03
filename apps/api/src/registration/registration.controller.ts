import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import { ClientOnboardingResponseDto } from './dto/client-onboarding.response.dto';
import { OnboardClientRequestDto } from './dto/onboard-client.request.dto';
import { RegistrationService } from './registration.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentIdentity } from '../auth/auth.decorator';
import type { TrustedIdentity } from '../auth/jwt-verifier.port';

@ApiTags('onboarding')
@Controller('onboarding')
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Post('client')
  @UseGuards(AuthGuard)
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
    @CurrentIdentity() identity: TrustedIdentity,
  ): Promise<ClientOnboardingResponseDto> {
    const result = await this.registration.onboard(body, identity);
    response.status(result.status);
    return result.body;
  }
}
