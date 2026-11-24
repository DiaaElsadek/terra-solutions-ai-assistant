/**
 * Local authentication adapter — DEMO ONLY.
 *
 * ⚠️  This adapter stores user credentials in localStorage with SHA-256
 *     hashing. It is NOT suitable for production use. Replace with a
 *     real auth provider (NextAuth, Clerk, Auth0, etc.) before deploying.
 *
 * Security notes:
 * - Passwords are hashed with SHA-256 (not bcrypt — this is a demo).
 * - No server-side session management.
 * - No CSRF protection.
 * - Credentials are browser-local and not shared between devices.
 */

import { v4 as uuidv4 } from "uuid";
import { STORAGE_KEYS } from "@/constants/config";
import * as storage from "@/lib/storage/local-storage";
import type {
  AuthProvider,
  AuthUser,
  SignInCredentials,
  SignUpCredentials,
  AuthResult,
} from "./types";

/** SHA-256 hash of a password. Demo only — use bcrypt in production. */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_terra_salt_demo");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const USERS_KEY = "terra_v1_auth_users";

function getStoredUsers(): StoredUser[] {
  return storage.getItem<StoredUser[]>(USERS_KEY, []);
}

export const localAuthAdapter: AuthProvider = {
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));

    const users = getStoredUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
    );

    if (!user) {
      return { success: false, error: "No account found with this email." };
    }

    const hash = await hashPassword(credentials.password);
    if (hash !== user.passwordHash) {
      return { success: false, error: "Incorrect password." };
    }

    const authUser: AuthUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
    };

    storage.setItem(STORAGE_KEYS.authUser, authUser);
    storage.setItem(STORAGE_KEYS.authSession, user.id);

    return { success: true, user: authUser };
  },

  async signUp(credentials: SignUpCredentials): Promise<AuthResult> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800));

    const users = getStoredUsers();
    const exists = users.some(
      (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
    );

    if (exists) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    const hash = await hashPassword(credentials.password);
    const now = new Date().toISOString();

    const storedUser: StoredUser = {
      id: uuidv4(),
      fullName: credentials.fullName.trim(),
      email: credentials.email.toLowerCase().trim(),
      passwordHash: hash,
      createdAt: now,
    };

    users.push(storedUser);
    storage.setItem(USERS_KEY, users);

    const authUser: AuthUser = {
      id: storedUser.id,
      fullName: storedUser.fullName,
      email: storedUser.email,
      createdAt: storedUser.createdAt,
    };

    storage.setItem(STORAGE_KEYS.authUser, authUser);
    storage.setItem(STORAGE_KEYS.authSession, storedUser.id);

    return { success: true, user: authUser };
  },

  async signOut(): Promise<void> {
    storage.removeItem(STORAGE_KEYS.authUser);
    storage.removeItem(STORAGE_KEYS.authSession);
  },

  getCurrentUser(): AuthUser | null {
    const session = storage.getItem<string | null>(
      STORAGE_KEYS.authSession,
      null
    );
    if (!session) return null;
    return storage.getItem<AuthUser | null>(STORAGE_KEYS.authUser, null);
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};

