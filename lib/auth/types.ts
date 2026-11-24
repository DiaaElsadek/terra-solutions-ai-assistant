/**
 * Authentication types.
 *
 * TEMPORARY LOCAL ADAPTER
 * This module provides a demo-only authentication interface.
 * In production, replace LocalAuthAdapter with a real auth provider
 * (e.g., NextAuth, Clerk, Auth0, Firebase Auth).
 *
 * The local adapter:
 * - Does NOT provide real security.
 * - Hashes passwords with SHA-256 before storing (not bcrypt — demo only).
 * - Stores credentials in localStorage (browser-local, not shared).
 * - Should NEVER be used in a production environment.
 */

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Abstract auth provider interface.
 * Implement this for any authentication backend.
 */
export interface AuthProvider {
  signIn(credentials: SignInCredentials): Promise<AuthResult>;
  signUp(credentials: SignUpCredentials): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  isAuthenticated(): boolean;
}

