import Joi from 'joi';

export const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;
export const LOG_LEVEL_VALUES = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
] as const;

export type NodeEnvironment = (typeof NODE_ENV_VALUES)[number];
export type LogLevel = (typeof LOG_LEVEL_VALUES)[number];

export interface Environment {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  HOST: string;
  LOG_LEVEL: LogLevel;
}

export const envSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string()
    .valid(...NODE_ENV_VALUES)
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  HOST: Joi.string().trim().min(1).default('0.0.0.0'),
  LOG_LEVEL: Joi.string()
    .valid(...LOG_LEVEL_VALUES)
    .default('info'),
}).unknown(true);

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment & Record<string, unknown> {
  const { error, value } = envSchema.validate(input, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    throw error;
  }

  return value as Environment & Record<string, unknown>;
}
