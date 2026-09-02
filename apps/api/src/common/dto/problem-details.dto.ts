import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PROBLEM_CODES = [
  'INPUT_INVALID',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'SEMANTIC_INVALID',
  'RATE_LIMITED',
  'DEPENDENCY_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ProblemCode = (typeof PROBLEM_CODES)[number];

export class ProblemDetailsDto {
  @ApiProperty({
    example: 'urn:reparared:error:INPUT_INVALID',
    description: 'RFC 7807 type URI (urn:reparared:error:{CODE})',
  })
  type!: string;

  @ApiProperty({
    example: 'Input Invalid',
    description: 'Short human-readable summary',
  })
  title!: string;

  @ApiProperty({ example: 400, description: 'HTTP status code' })
  status!: number;

  @ApiProperty({
    example: 'The request input is invalid.',
    description: 'Detailed explanation',
  })
  detail!: string;

  @ApiProperty({
    example: 'INPUT_INVALID',
    enum: PROBLEM_CODES as unknown as string[],
    description: 'Stable error code (9 values)',
  })
  code!: ProblemCode;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Correlation trace ID',
  })
  traceId!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    description: 'Optional field-level errors keyed by field path',
  })
  fieldErrors?: Record<string, string[]>;
}
