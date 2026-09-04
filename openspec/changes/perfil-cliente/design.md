# Design: Client Profile Editing

## Technical Approach

Add a capability-oriented `ProfilesModule` beside registration. `PATCH /api/v1/me/profile` consumes the existing verified `AuthGuard`/`@CurrentIdentity()` seam, resolves ownership only from the verified subject and persisted `User.role`, then performs a short, locked Prisma transaction. The endpoint returns the allowlisted onboarding projection and never changes email or role.

## Architecture Decisions

| Decision | Options / trade-off | Choice and rationale |
|---|---|---|
| Module boundary | Extend registration; new profiles module | New `apps/api/src/profiles/`; preserves lifecycle separation and gives #15 a reusable base. |
| Validation reuse | Duplicate; change registration now; new common helpers | Add small field validators and an active-district transaction helper under `apps/api/src/common/validation/`. Registration remains unchanged; #15 can adopt them later, avoiding scope expansion. |
| Profile lock | Prisma `findUnique`; raw `FOR UPDATE` | Parameterized `$queryRaw` lock, followed by Prisma `clientProfile.findUnique`; this is the ADR-0015 intent and is testable offline. |
| Authorization | JWT role/body identifier; persisted role + subject | Use database role and verified subject. Missing user/profile is generic 404; non-`CLIENT` is 403. Body `userId` never selects a row and is rejected as an unknown field by the strict parser. |

## Data Flow

```text
Fastify PATCH /api/v1/me/profile
  -> AuthGuard -> @CurrentIdentity()
  -> ProfilesController -> ProfilesService parser
  -> persisted User role/ID -> $transaction
  -> FOR UPDATE profile lock -> Prisma reread
  -> optional active district FOR SHARE -> partial update
  -> sanitized projection -> ProblemDetailsFilter + trace ID
```

## Module, Service, and DTO Shapes (normative)

`profiles.module.ts` imports `DatabaseModule` and `AuthModule.register(identityPort)`, provides `ProfilesService`, and exposes `ProfilesController`. `app.module.ts` wires the module and forwards the existing test identity seam. The controller uses `@ApiTags('profiles')`, `@Controller('me')`, `@Patch('profile')`, `@UseGuards(AuthGuard)`, and `@CurrentIdentity()`. Swagger declares 200 with the response DTO and 400/401/403/404/422/500 with `ProblemDetailsDto`.

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientProfileResponseDto as OnboardingProfileDto } from '../../registration/dto/client-onboarding.response.dto';

export class UpdateClientProfileRequestDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 }) name?: string;
  @ApiPropertyOptional({ pattern: '^\\+[1-9]\\d{7,14}$' }) phone?: string;
  @ApiPropertyOptional({ format: 'uuid' }) districtId?: string;
}

export class ClientProfileResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ enum: ['CLIENT'] })
  role!: 'CLIENT';
  @ApiProperty({ type: OnboardingProfileDto })
  profile!: OnboardingProfileDto;
}
```

```ts
const owner = await prisma.user.findUnique({
  where: { authSubject: identity.authSubject }, select: { id: true, role: true },
});
if (!owner) throw new NotFoundException();
if (owner.role !== 'CLIENT') throw new ForbiddenException();
const input = parseUpdate(raw); // whitelist, presence-aware, at least one field
return prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT user_id FROM client_profiles
    WHERE user_id = ${owner.id} FOR UPDATE`;
  const current = await tx.clientProfile.findUnique({ where: { userId: owner.id } });
  if (!current) throw new NotFoundException();
  if (input.districtId !== undefined) await assertActiveDistrict(tx, input.districtId);
  const data = pickDefined({ ...input, name: input.name?.trim() });
  await tx.clientProfile.update({ where: { userId: owner.id }, data });
  return project(await tx.user.findUnique({ where: { id: owner.id }, select: projection }));
});
```

The parser rejects non-objects, unknown keys, empty updates, wrong types, names outside trimmed 2–100 meaningful characters, invalid E.164 phones, and malformed UUIDs with `BadRequestException({ fieldErrors })`. `assertActiveDistrict` uses tagged `$queryRaw` with `active = true FOR SHARE`; no row yields `UnprocessableEntityException({ fieldErrors: { districtId: [...] } })`. Preserve known HTTP exceptions and map unexpected persistence failures to generic 500.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/profiles/{profiles.module.ts,profiles.controller.ts,profiles.service.ts}` | Create | Guarded PATCH orchestration and transactional persistence. |
| `apps/api/src/profiles/dto/update-client-profile.request.dto.ts` | Create | Optional editable fields with Swagger metadata. |
| `apps/api/src/profiles/dto/client-profile.response.dto.ts` | Create | Reuses onboarding's sanitized nested profile shape. |
| `apps/api/src/common/validation/` | Create | Reusable field and district-transaction helpers; registration is not changed. |
| `apps/api/src/app.module.ts` | Modify | Import and wire `ProfilesModule`. |
| `apps/api/src/profiles/*.spec.ts`, test helper | Create/modify | Unit, inject, and shared JWKS fixture coverage. |
| `apps/api/openapi.json`, `packages/api-client/src/generated.ts` | Regenerate | Additive PATCH path, schemas, security, and problem responses. |

## Contract Flow

`contract:export` grows the OpenAPI document; `contract:generate` refreshes `generated.ts`; `contract:validate` and `contract:check` must pass. Additive assertions compare old and new paths/schemas and require all existing paths to remain present.

## Testing Strategy

| Layer | Planned evidence |
|---|---|
| Unit | `profiles.service.spec.ts`: one/all fields, only-defined update data, empty/bounds errors with field errors, role 403, absent 404, district `FOR SHARE`/422, profile `FOR UPDATE` recording, projection, rollback, and tagged-query parameterization. |
| Integration | `profiles.integration.spec.ts` with Fastify `inject()` and test-JWKS tokens: client 200, technician 403, no token 401, 404, inactive district 422, malformed 400, trace header, sanitized response, and body `userId` unable to authorize another profile (strict unknown-field request is 400; valid requests resolve only the token owner). |
| Fixture/contract | Extract the embedded RSA/JWKS fixture from `auth/jwks-verifier.spec.ts` into a test helper (or minimally duplicate it), then run export, generate, validate, check, diff, and client typecheck. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and planned RED test |
|---|---|---|
| Trust/identity boundary | Applicable | Subject-derived owner only; different body `userId` cannot select data. RED injects a differing identifier and asserts no other profile access. |
| Secrets/projection | Applicable | Return only `id`, `role`, and profile fields; RED scans responses for internals, tokens, passwords, and provider details. |
| SQL injection | Applicable | Tagged parameterized raw queries only; RED asserts district/user values are parameters, never concatenated SQL. |
| Log injection | Applicable | Never log raw input; RED submits control characters and asserts generic rejection with no forged log line. |
| Documentation-like paths | N/A — no execution/classification change | No task or test. |
| Git repository selection | N/A — no Git automation | No task or test. |
| Commit state | N/A — apply-owned; single-commit delivery | No task or test. |
| Push state | N/A — no push automation | No task or test. |
| PR commands | N/A — no PR automation | No task or test. |

## Migration / Rollout

No schema, environment, dependency, or manifest change. Regenerated contract artifacts are committed with the implementation as one cohesive commit; rollback is a revert. Live PostgreSQL locks/triggers, live provider claims, production smoke, and deployment remain `PENDING GATE`.

## Open Questions

None expected.
