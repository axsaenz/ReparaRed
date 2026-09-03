# Design: Client Onboarding

## Technical Approach

Add a `RegistrationModule` beside `CatalogsModule`. The controller accepts only complete profile data; the service obtains trusted identity per request, normalizes the provider email, performs friendly pre-reads, then executes one short Prisma transaction. This implements all requirements and scenarios in `specs/client-onboarding/spec.md` without credentials, provider calls, schema changes, or changes to the existing problem filter.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Validation | Add `class-validator`; manual parsing | Manual parsing, matching catalogs and avoiding an uninstalled dependency. Reject non-object bodies, unknown keys (including `authSubject`, `email`, `password`, and `token`), invalid name/phone/UUID, and missing fields with `BadRequestException`. |
| Identity seam | `x-test-identity`; Nest override; default fake | `RegistrationModule.register(provider)` requires an explicit `IDENTITY_PORT`. Call it inside the service for every request. `createApp({ identityPort })` is the offline/test seam; no test header can become production authority. Production `createApp()` binds an unavailable/throwing guard, not a fake; export/offline setup supplies a fake explicitly. |
| District lock | Prisma `findUnique`; raw lock query | Use parameterized `$queryRaw` for `FOR SHARE`. Prisma `findUnique` cannot express `active=true` plus a row lock; this intent is tested offline but remains a pending live-PostgreSQL gate. |

## Data Flow

```text
Fastify POST /api/v1/onboarding/client
  -> Controller -> manual parser + IdentityPort
  -> pre-read subject/email -> Prisma $transaction
  -> active district lock -> User + nested ClientProfile
  -> sanitized DTO -> ProblemDetailsFilter on errors
```

## Service Algorithm (normative)

The frozen five phases are: normalize trusted provider email; obtain and verify identity; pre-read subject then normalized email; execute the single district-check/create transaction; return the allowlisted projection.

```ts
async onboard(raw: unknown): Promise<{ status: 200 | 201; body: ClientOnboardingResponseDto }> {
  const input = parseOnboardRequest(raw); // only name, phone, districtId
  const identity = await identityPort.getVerifiedIdentity();
  const email = normalizeEmail(identity.email); // trim + locale-independent lowercase
  if (!identity.emailVerified) throw new UnauthorizedException();

  const bySubject = await prisma.user.findUnique({
    where: { authSubject: identity.authSubject },
    select: userProjectionSelect,
  });
  if (bySubject?.role !== undefined && bySubject.role !== 'CLIENT') {
    throw new ConflictException();
  }
  if (bySubject?.role === 'CLIENT' && bySubject.clientProfile) {
    return { status: 200, body: project(bySubject) };
  }
  if (!bySubject) {
    const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (byEmail) throw new ConflictException();
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { authSubject: identity.authSubject },
        select: userProjectionSelect,
      });
      if (current?.role !== undefined && current.role !== 'CLIENT') {
        throw new ConflictException();
      }
      if (current?.clientProfile) return { status: 200 as const, row: current };
      if (!current) {
        const duplicate = await tx.user.findUnique({ where: { email }, select: { id: true } });
        if (duplicate) throw new ConflictException();
      }
      const district = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM districts WHERE id = ${input.districtId}
          AND active = true FOR SHARE`;
      if (district.length === 0) {
        throw new UnprocessableEntityException({
          fieldErrors: { districtId: ['districtId must reference an active district.'] },
        });
      }
      if (current) {
        return { status: 200 as const, row: await tx.user.update({
          where: { id: current.id },
          data: { clientProfile: { create: input } },
          select: userProjectionSelect,
        }) };
      }
      return { status: 201 as const, row: await tx.user.create({
        data: { authSubject: identity.authSubject, email, role: 'CLIENT', clientProfile: { create: input } },
        select: userProjectionSelect,
      }) };
    });
    return { status: result.status, body: project(result.row) };
  } catch (error) {
    if (isEmailP2002(error)) throw new ConflictException();
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException();
  }
}
```

`project` selects only `id`, `role`, and `clientProfile{name, phone, districtId}`. Complete retries return before writing; an existing client without a profile is completed transactionally. No network call occurs in the transaction.

## Interfaces / Contracts

```ts
export const IDENTITY_PORT = Symbol('IDENTITY_PORT');
export interface IdentityPort {
  getVerifiedIdentity(): Promise<{
    authSubject: string;
    email: string;
    emailVerified: boolean;
  }>;
}
```

```ts
export class OnboardClientRequestDto {
  @ApiProperty({ minLength: 2, maxLength: 100 }) name!: string;
  @ApiProperty({ pattern: '^\\+[1-9]\\d{7,14}$', example: '+51987654321' }) phone!: string;
  @ApiProperty({ format: 'uuid' }) districtId!: string;
}

export class ClientProfileResponseDto {
  @ApiProperty() name!: string;
  @ApiProperty({ pattern: '^\\+[1-9]\\d{7,14}$' }) phone!: string;
  @ApiProperty({ format: 'uuid' }) districtId!: string;
}

export class ClientOnboardingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['CLIENT'] }) role!: 'CLIENT';
  @ApiProperty({ type: ClientProfileResponseDto }) profile!: ClientProfileResponseDto;
}
```

`registration.module.ts` imports `DatabaseModule`, provides the service and port, and exports no fake. The controller uses `@ApiTags('onboarding')`, `@Controller('onboarding')`, `@Post('client')`, `@ApiOperation`, response DTOs for 200/201, and `ProblemDetailsDto` for 400/401/409/422/500; it sets status dynamically. The service maps `P2002` only when `meta.target` includes `email`.

`AppModule` composes an explicit unavailable guard for unchanged `createApp()`. `createApp({ identityPort })` is the inject-test seam; `createAppForExport()` supplies a deterministic fake only for offline export. No production fake or provider configuration is used.

## Error Mapping

| Condition | HTTP / code | Safe behavior |
|---|---|---|
| Unverified/missing identity | 401 `AUTHENTICATION_REQUIRED` | Generic body; no `WWW-Authenticate` detail. |
| Same subject non-client role; different user same email; email race | 409 `CONFLICT` | Generic body; no database/provider text. |
| Missing/inactive district | 422 `SEMANTIC_INVALID` | `fieldErrors.districtId` has the stable message above. |
| Malformed/identity-bearing body | 400 `INPUT_INVALID` | No persistence. |
| Unexpected failure | 500 `INTERNAL_ERROR` | Existing filter supplies ProblemDetails and trace ID. |

## Testing Strategy

`registration.service.spec.ts` uses fake Prisma and asserts one `$transaction`, normalization, `CLIENT`, nested profile, raw-lock parameterization, rollback, safe projection, and email `P2002`/pre-read conflicts. Auth fakes cover verified/unverified contexts. `registration.integration.spec.ts` uses `createApp({ identityPort })` and `server.inject` for exact 201/200/409/422/401/400 JSON, trace header, inactive district, role mismatch, and response scans for `authSubject`, password, or token.

DTO Swagger metadata drives `contract:export`; then run `contract:generate`, `contract:validate`, `contract:check`, and `contract:diff`. The additive path is `/api/v1/onboarding/client` plus request/response schemas and listed errors; local `FIRST-BASELINE` skip is acceptable.

## Threat Matrix

| Boundary | Applicability and response | Planned RED test |
|---|---|---|
| Trust boundary | Applicable: identity comes only from `IdentityPort`; body identity keys are rejected. | Inject body `authSubject`/`email`; assert 400 or ignored authority and no persistence. |
| Secrets | Applicable: no credentials stored/transmitted; projection is allowlisted. | Scan all response bodies for password, token, subject, and provider text. |
| SQL injection | Applicable: tagged `$queryRaw` interpolation only; never `$queryRawUnsafe`. | Assert fake query records a parameter, not concatenated district SQL. |
| Log injection | Applicable: do not log provider email; any future log uses normalized value. | Newline/control-character identity email produces no raw log entry. |
| Documentation-like paths | N/A — no execution of documentation paths. | N/A |
| Git repository selection | N/A — no Git command or repository selection. | N/A |
| Commit state | N/A — commit state is apply-owned; intended delivery is one commit. | N/A |
| Push state | N/A — no push automation. | N/A |
| PR commands | N/A — no PR automation. | N/A |

## File Changes

Create `apps/api/src/registration/` module, controller, service, `dto/onboard-client.request.dto.ts`, `dto/client-onboarding.response.dto.ts`, and `auth.port.ts`; modify `app.module.ts` and `app.factory.ts` only for wiring/seam; add the two registration test files; regenerate `apps/api/openapi.json` and `packages/api-client/src/generated.ts`. No schema, environment, client transport, or common error-file changes.

## Migration / Rollout

No migration or environment change. Deliver as one commit; rollback is a revert. Live Supabase, PostgreSQL transaction/rollback/trigger/lock behavior, and BFF flows remain explicitly PENDING.

## Open Questions

None expected.
