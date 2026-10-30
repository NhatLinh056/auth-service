export interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T = any>(
  path: string,
  options: ApiRequestOptions = {},
  token: string | null = null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const activeToken = token ?? localStorage.getItem('auth_token');
  if (activeToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  // Ensure relative path has leading slash
  const url = path.startsWith('http') ? path : (path.startsWith('/') ? path : `/${path}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: Request failed`;
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data.message)) {
        errorMsg = data.message.join(', ');
      } else if (typeof data.message === 'string') {
        errorMsg = data.message;
      } else if (data.error) {
        errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }
    } else if (typeof data === 'string' && data.length > 0) {
      errorMsg = data;
    }
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}
