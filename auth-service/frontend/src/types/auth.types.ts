export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
