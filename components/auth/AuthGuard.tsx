"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TerraMark } from "@/components/branding/TerraMark";
import { useAuth } from "@/lib/auth/context";
import { ROUTES } from "@/constants/config";

/**
 * Protects workspace routes by redirecting unauthenticated sessions to /signin.
 * Shows a hydration-safe loading state until localStorage auth state resolves.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const target = `${ROUTES.signIn}?next=${encodeURIComponent(pathname || ROUTES.chat)}`;
      router.replace(target);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-4 px-4">
        <TerraMark size="lg" variant="tile" />
        <div className="w-28 h-1 rounded-full terra-shimmer" aria-hidden="true" />
        <p className="text-sm text-foreground-muted">
          {isLoading
            ? "Loading Terra Solutions Assistant…"
            : "Redirecting to sign in…"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

