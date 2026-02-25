import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { fetchJSONWithRetry } from '@/data/retryFetch';

const originalFetch = globalThis.fetch;

type FetchStep = Response | Error;

function jsonResponse(body: unknown, status: number = 200, statusText: string = 'OK'): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchJSONWithRetry', () => {
  let steps: FetchStep[] = [];

  const fetchMock = mock(async () => {
    const next = steps.shift();
    if (!next) throw new Error('Missing mocked fetch step');
    if (next instanceof Error) throw next;
    return next;
  });

  beforeEach(() => {
    steps = [];
    fetchMock.mockClear();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retries on 429 and eventually succeeds', async () => {
    steps = [
      jsonResponse({ message: 'rate limited' }, 429, 'Too Many Requests'),
      jsonResponse({ ok: true }),
    ];

    const result = await fetchJSONWithRetry<{ ok: boolean }>(
      'https://example.com/test',
      undefined,
      { label: 'Test API', maxRetries: 4, baseDelayMs: 0, maxDelayMs: 0 },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable 4xx responses', async () => {
    steps = [
      jsonResponse({ message: 'bad request' }, 400, 'Bad Request'),
      jsonResponse({ ok: true }),
    ];

    await expect(
      fetchJSONWithRetry('https://example.com/test', undefined, {
        label: 'Test API',
        maxRetries: 4,
        baseDelayMs: 0,
        maxDelayMs: 0,
      }),
    ).rejects.toThrow('Test API 400: Bad Request');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient network failures', async () => {
    steps = [
      new Error('Network down'),
      jsonResponse({ ok: true }),
    ];

    const result = await fetchJSONWithRetry<{ ok: boolean }>(
      'https://example.com/test',
      undefined,
      { label: 'Test API', maxRetries: 4, baseDelayMs: 0, maxDelayMs: 0 },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
