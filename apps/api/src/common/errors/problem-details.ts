export const PROBLEM_DEFINITIONS = {
  INPUT_INVALID: {
    status: 400,
    title: 'Input Invalid',
    detail: 'The request input is invalid.',
  },
  AUTHENTICATION_REQUIRED: {
    status: 401,
    title: 'Authentication Required',
    detail: 'Authentication is required.',
  },
  FORBIDDEN: {
    status: 403,
    title: 'Forbidden',
    detail: 'You do not have permission to perform this action.',
  },
  NOT_FOUND: {
    status: 404,
    title: 'Not Found',
    detail: 'The requested resource was not found.',
  },
  CONFLICT: {
    status: 409,
    title: 'Conflict',
    detail: 'The request conflicts with the current resource state.',
  },
  SEMANTIC_INVALID: {
    status: 422,
    title: 'Semantic Input Invalid',
    detail: 'The request is semantically invalid.',
  },
  RATE_LIMITED: {
    status: 429,
    title: 'Rate Limited',
    detail: 'Too many requests.',
  },
  DEPENDENCY_UNAVAILABLE: {
    status: 503,
    title: 'Dependency Unavailable',
    detail: 'A required dependency is unavailable.',
  },
  INTERNAL_ERROR: {
    status: 500,
    title: 'Internal Error',
    detail: 'An unexpected error occurred.',
  },
} as const;

export type ProblemCode = keyof typeof PROBLEM_DEFINITIONS;
export type FieldErrors = Record<string, string[]>;

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: ProblemCode;
  traceId: string;
  fieldErrors?: FieldErrors;
}

export function problemCodeForStatus(status: number): ProblemCode {
  const entry = Object.entries(PROBLEM_DEFINITIONS).find(
    ([, definition]) => definition.status === status,
  );

  return (entry?.[0] as ProblemCode | undefined) ?? 'INTERNAL_ERROR';
}

export function createProblemDetails(
  status: number,
  traceId: string,
  fieldErrors?: FieldErrors,
): ProblemDetails {
  const code = problemCodeForStatus(status);
  const definition = PROBLEM_DEFINITIONS[code];

  return {
    type: `urn:reparared:error:${code}`,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    code,
    traceId,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export function normalizeFieldErrors(input: unknown): FieldErrors | undefined {
  const candidates: Array<{ field: unknown; messages: unknown }> = [];

  if (Array.isArray(input)) {
    candidates.push(...input.map((item) => extractFieldError(item)));
  } else if (isRecord(input)) {
    if ('field' in input && 'messages' in input) {
      candidates.push(extractFieldError(input));
    }

    const fieldErrors = input.fieldErrors;
    if (isRecord(fieldErrors)) {
      candidates.push(
        ...Object.entries(fieldErrors).map(([field, messages]) => ({
          field,
          messages,
        })),
      );
    }
  }

  const normalized = new Map<string, string[]>();
  for (const candidate of candidates) {
    if (typeof candidate.field !== 'string') {
      continue;
    }

    const field = candidate.field.trim();
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(field)) {
      continue;
    }

    const messages = normalizeMessages(candidate.messages);
    if (messages.length > 0) {
      normalized.set(field, [...(normalized.get(field) ?? []), ...messages]);
    }
  }

  const sortedEntries = [...normalized.entries()]
    .map(([field, messages]) => [field, [...new Set(messages)].sort()] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  return sortedEntries.length > 0
    ? Object.fromEntries(sortedEntries)
    : undefined;
}

function extractFieldError(input: unknown): {
  field: unknown;
  messages: unknown;
} {
  if (!isRecord(input)) {
    return { field: undefined, messages: undefined };
  }

  return { field: input.field, messages: input.messages };
}

function normalizeMessages(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((message) =>
      message
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 256),
    )
    .filter(Boolean);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
