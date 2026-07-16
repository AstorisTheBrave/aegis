export interface RetryDirective {
  readonly retryAfterMs: number;
  readonly reason: 'rate_limit' | 'transient_failure';
}

export interface DirectoryIdentity {
  readonly id: string;
  readonly displayName: string;
  readonly email?: string;
  readonly active?: boolean;
  readonly identityType?: 'human' | 'service_account' | 'bot';
  readonly attributes?: Readonly<Record<string, string | boolean | number>>;
}

export interface DirectoryGroup {
  readonly id: string;
  readonly displayName: string;
  readonly privileged?: boolean;
  readonly attributes?: Readonly<Record<string, string | boolean | number>>;
}

export interface DirectoryMembership {
  readonly groupId: string;
  readonly identityId: string;
  readonly grantType?: 'DIRECT' | 'GROUP' | 'INHERITED';
}

export { buildDirectoryGraph } from './directory-graph.js';
export {
  DirectoryApiConnector,
  SnapshotDirectoryConnector,
  type DirectoryConnectorDefinition,
  type DirectoryConnectorInput,
  type DirectorySnapshot,
  type ReadOnlyDirectorySource,
} from './directory-connector.js';

export interface ReadOnlyClientOptions {
  readonly origin: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly fetcher?: typeof fetch;
  readonly maxRetries?: number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

export class ReadOnlyProviderClient {
  private readonly origin: URL;
  private readonly fetcher: typeof fetch;
  private readonly headers: Readonly<Record<string, string>>;
  private readonly maxRetries: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: ReadOnlyClientOptions) {
    this.origin = new URL(options.origin);
    if (this.origin.protocol !== 'https:') throw new Error('Connector origins must use HTTPS');
    this.fetcher = options.fetcher ?? fetch;
    this.headers = options.headers ?? {};
    this.maxRetries = options.maxRetries ?? 2;
    this.sleep =
      options.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async getJson<T>(path: string, headers: Readonly<Record<string, string>> = {}): Promise<T> {
    const response = await this.request(path, headers);
    if (!response.ok)
      throw new Error(`Provider request failed: ${response.status} ${response.statusText}`);
    return (await response.json()) as T;
  }

  async list<T>(
    path: string,
    select: (payload: unknown) => readonly T[] = arrayPayload,
  ): Promise<T[]> {
    const values: T[] = [];
    let nextPath: string | undefined = path;
    while (nextPath) {
      const response = await this.request(nextPath, {});
      if (!response.ok)
        throw new Error(`Provider request failed: ${response.status} ${response.statusText}`);
      values.push(...select(await response.json()));
      nextPath = nextLink(response.headers.get('link'), this.origin);
    }
    return values;
  }

  private async request(
    path: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<Response> {
    const url = resolveProviderUrl(this.origin, path);
    for (let attempt = 0; ; attempt += 1) {
      const response = await this.fetcher(url, {
        method: 'GET',
        headers: { ...this.headers, ...headers },
      });
      const retry = retryDirective(response);
      if (!retry || attempt >= this.maxRetries) return response;
      await this.sleep(retry.retryAfterMs);
    }
  }
}

export function resolveProviderUrl(origin: URL, path: string): string {
  const candidate = new URL(path, origin);
  if (candidate.origin !== origin.origin)
    throw new Error('Connector request escaped configured provider origin');
  return candidate.toString();
}

export function retryDirective(response: Response): RetryDirective | undefined {
  if (response.status !== 429 && ![502, 503, 504].includes(response.status)) return undefined;
  const retryAfter = Number(response.headers.get('retry-after'));
  return {
    retryAfterMs: Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : 250,
    reason: response.status === 429 ? 'rate_limit' : 'transient_failure',
  };
}

function arrayPayload<T>(payload: unknown): readonly T[] {
  if (!Array.isArray(payload)) throw new Error('Provider list response must be an array');
  return payload as readonly T[];
}

function nextLink(link: string | null, origin: URL): string | undefined {
  const value = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  return value ? resolveProviderUrl(origin, value) : undefined;
}
