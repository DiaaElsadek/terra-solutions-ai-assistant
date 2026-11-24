"use client";

/**
 * Authentication context provider.
 * Wraps the application to provide auth state and actions.
 *
 * NOTE: Currently uses the local demo adapter.
 *       Replace `localAuthAdapter` with a real auth provider in production.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { localAuthAdapter } from "./local-adapter";
import { ROUTES } from "@/constants/config";
import type {
  AuthUser,
  SignInCredentials,
  SignUpCredentials,
  AuthResult,
} from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: SignInCredentials) => Promise<AuthResult>;
  signUp: (credentials: SignUpCredentials) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const noopSubscribe = () => () => {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const [userOverride, setUserOverride] = useState<AuthUser | null | undefined>(
    undefined
  );
  const router = useRouter();

  const user = !isHydrated
    ? null
    : userOverride !== undefined
      ? userOverride
      : localAuthAdapter.getCurrentUser();
  const isLoading = !isHydrated;

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<AuthResult> => {
      const result = await localAuthAdapter.signIn(credentials);
      if (result.success && result.user) {
        setUserOverride(result.user);
      }
      return result;
    },
    []
  );

  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<AuthResult> => {
      const result = await localAuthAdapter.signUp(credentials);
      if (result.success && result.user) {
        setUserOverride(result.user);
      }
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    await localAuthAdapter.signOut();
    setUserOverride(null);
    router.push(ROUTES.signIn);
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Access auth state and actions. Must be used within AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
