import 'dotenv/config';

export interface AppConfig {
  port: number;
  authServiceUrl: string;
  appId: string;
  appToken: string;
  publicUrl: string;
}

export function getPublicUrl(): string {
  const configured = process.env.PUBLIC_URL;
  if (process.env.NODE_ENV === 'production' && !configured) {
    throw new Error('PUBLIC_URL is required in production');
  }
  const value = configured || `http://localhost:${process.env.PORT || '3001'}`;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Invalid PUBLIC_URL'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && local && process.env.NODE_ENV !== 'production'))) {
    throw new Error('PUBLIC_URL must be an HTTPS origin (HTTP is allowed for local development)');
  }
  return url.origin;
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
  appId: process.env.APP_ID || process.env.AUTH_SERVICE_APP_ID || '',
  appToken: process.env.APP_TOKEN || process.env.AUTH_SERVICE_APP_TOKEN || '',
  publicUrl: getPublicUrl(),
};
