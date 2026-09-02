import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './generated';

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

export function createApiClient(options: ApiClientOptions): Client<paths> {
  return createClient<paths>({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    headers: options.headers,
  });
}
