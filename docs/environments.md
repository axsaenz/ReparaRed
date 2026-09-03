# Environment Matrix

ReparaRed has three deployment classes: local development, pull-request
preview, and production. The classes are deliberately separate even when a
provider offers a convenient default environment. A preview MUST never point
at production PostgreSQL, Auth, Storage, Railway, or Vercel resources.

## Variable classification

The tables below list names only. Empty cells are intentional; this document
does not contain URLs, tokens, keys, passwords, or project identifiers.

| Environment | Application | Consumed today | Future or planned | Value owner |
|---|---|---|---|---|
| Local | API | `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL`, `DATABASE_URL`, `DIRECT_URL`, `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE` | `STORAGE_SERVICE_KEY`, `STORAGE_BUCKET_NAME` | Local developer or local secret store |
| Preview | API | `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL`, `DATABASE_URL`, `DIRECT_URL`, `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE` | `STORAGE_SERVICE_KEY`, `STORAGE_BUCKET_NAME` | GitHub preview environment and isolated provider project |
| Production | API | `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL`, `DATABASE_URL`, `DIRECT_URL`, `AUTH_ISSUER_URL`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE` | `STORAGE_SERVICE_KEY`, `STORAGE_BUCKET_NAME` | Railway production environment and GitHub production environment |
| Local | Web | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`, `ALLOW_INSECURE_LOCAL_COOKIES` | `API_ORIGIN`, `NEXT_PUBLIC_APP_ENV` | Local developer settings |
| Preview | Web | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`, `ALLOW_INSECURE_LOCAL_COOKIES` | `API_ORIGIN`, `NEXT_PUBLIC_APP_ENV` | Vercel preview settings |
| Production | Web | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS` | `ALLOW_INSECURE_LOCAL_COOKIES`, `API_ORIGIN`, `NEXT_PUBLIC_APP_ENV` | Vercel production settings |

## API variables

The current API reads the following nine variables:

| Name | Classification | Current use |
|---|---|---|
| `NODE_ENV` | Server-only | Selects the runtime environment. |
| `PORT` | Server-only | Selects the HTTP listener port. |
| `HOST` | Server-only | Selects the HTTP listener host. |
| `LOG_LEVEL` | Server-only | Selects the application log level. |
| `DATABASE_URL` | Server-only | Runtime transaction-pool connection. |
| `DIRECT_URL` | Server-only | Prisma migration and approved seed connection. |
| `AUTH_ISSUER_URL` | Server-only | JWT issuer used for local token verification. |
| `AUTH_JWKS_URL` | Server-only | Cached remote key set used for local token verification. |
| `AUTH_AUDIENCE` | Server-only | Required JWT audience used for local token verification. |

`DATABASE_URL` and `DIRECT_URL` are never public values. In production,
`DATABASE_URL` should be the provider's transaction-pool connection and
`DIRECT_URL` should be the direct PostgreSQL connection reserved for Prisma
operations. The web host receives neither value.

The remaining names below are reserved for later storage adapters; the auth
names are consumed by this change and remain server-only.

| Name | Classification | Status |
|---|---|---|
| `AUTH_ISSUER_URL` | Server-only | Consumed by API JWT verification; never logged. |
| `AUTH_JWKS_URL` | Server-only | Consumed by API cached JWKS verification; never logged. |
| `AUTH_AUDIENCE` | Server-only | Consumed by API JWT verification; never logged. |
| `STORAGE_SERVICE_KEY` | Server-only | Future storage adapter; never public. |
| `STORAGE_BUCKET_NAME` | Server-only | Future storage adapter; not consumed today. |

## Web variables

The web BFF consumes `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`, and
the explicit local-only `ALLOW_INSECURE_LOCAL_COOKIES` switch. `API_ORIGIN` is
reserved as a server-only origin and `NEXT_PUBLIC_APP_ENV` as a deliberately
public environment label. None grants database or Storage access. Do not invent
`NEXT_PUBLIC_DATABASE_URL`, `NEXT_PUBLIC_DIRECT_URL`, service keys, or other
privileged browser variables.

## Resource isolation

| Resource | Local | Preview | Production |
|---|---|---|---|
| PostgreSQL | Local or developer database | Dedicated preview database and direct URL | Production database with pooled and direct URLs |
| Storage | Local or explicitly assigned development bucket | Dedicated preview bucket | Private `request-images` bucket |
| API | Local process | Isolated Railway preview service | Railway production service |
| Web | Local Next.js process | Vercel preview deployment | Vercel production deployment |

Preview credentials are all namespaced with the `PREVIEW` marker in GitHub
settings and are checked before any provider validation. Missing credentials
result in an auditable skip, not a fallback to production. A preview may use a
provider-generated URL, but the database, bucket, API service, and web
deployment must still be non-production resources.

## Secret handling rules

* Example files contain names and blank assignments only.
* Server-only values stay in local secret stores, Railway, or GitHub Secrets.
* Public web values are limited to non-privileged display/origin settings.
* Provider configuration is committed without credentials.
* CI logs mask values and never print secret contents.
* A missing production secret fails before promotion; missing preview secrets
  produce `PREVIEW SKIPPED` with a summary marker.
* Static validation is evidence of repository hygiene only. It does not prove
  that a provider project, service, or credential has been provisioned.

## Ownership and change procedure

When an implemented feature begins consuming a future variable, update this
matrix, the relevant `.env.example`, the provider runbook, and the static
validation test in the same change. Record whether the value is server-only or
public. Do not add a value to an example file to make a local deployment
appear configured; use a local secret store or a separate ignored `.env` file.

The deployment runbook is the source for provider setup and release evidence.
This matrix is the source for classification and isolation expectations.
