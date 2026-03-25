export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getAuthHeaders(): HeadersInit {
  // In a real app, this might come from next-auth or a cookie
  return {
    'Content-Type': 'application/json',
  };
}

async function extractErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await res.json().catch(() => null);
    if (payload && typeof payload === 'object' && 'detail' in payload) {
      const detail = payload.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }
    }
  }
  return res.text();
}

export async function apiClient<T>(
  method: string,
  path: string,
  body?: unknown,
  customHeaders?: HeadersInit
): Promise<T> {
  if (USE_MOCKS) {
    // Dynamic import to avoid bundling mock data in production
    const { getMockResponse } = await import('@/mocks/handlers');
    return getMockResponse<T>(method, path, body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...getAuthHeaders(), ...customHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await extractErrorMessage(res));
  }

  // Handle empty responses
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}
