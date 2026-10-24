import 'dotenv/config';

export interface AppConfig {
  port: number;
  authServiceUrl: string;
  appId: string;
  appToken: string;
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
  appId: process.env.APP_ID || process.env.AUTH_SERVICE_APP_ID || '',
  appToken: process.env.APP_TOKEN || process.env.AUTH_SERVICE_APP_TOKEN || '',
};
