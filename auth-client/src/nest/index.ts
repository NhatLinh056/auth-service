export {
  AuthModule,
  type NestAuthModuleOptions,
  type NestAuthModuleAsyncOptions,
} from './auth.module.js';
export { AuthGuard } from './auth.guard.js';
export { CurrentUser } from './current-user.decorator.js';
export { AuthCallbackController } from './auth-callback.controller.js';
export { AUTH_CLIENT, AUTH_MODULE_OPTIONS } from './constants.js';

// Explicit re-exports of core SDK types for developer convenience
export {
  AuthClient,
  createAuthClient,
  signTransaction,
  verifyTransaction,
  AuthClientError,
  AuthClientConfigError,
  AuthClientSecurityError,
  AuthClientHttpError,
  AuthClientVerificationError,
  type AuthClientOptions,
  type VerifyServiceResult,
  type LoginTransaction,
  type BeginLoginOptions,
  type AppUserProfile,
  type OAuthProviderInfo,
  type CookieOptions,
} from '../client.js';
