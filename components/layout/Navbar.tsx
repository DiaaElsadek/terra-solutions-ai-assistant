"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, MessageSquare, LogIn, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { NAV_LINKS } from "@/constants/brand";
import { ROUTES } from "@/constants/config";
import { useAuth } from "@/lib/auth/context";

/**
 * Top navigation bar for marketing and authentication pages.
 */
export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo href={ROUTES.home} />

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {!isLoading && isAuthenticated && user ? (
            <Link href={ROUTES.chat}>
              <Button
                variant="primary"
                size="md"
                leftIcon={<MessageSquare className="h-4 w-4" />}
              >
                Open Workspace
              </Button>
            </Link>
          ) : (
            <>
              <Link href={ROUTES.signIn}>
                <Button
                  variant="ghost"
                  size="md"
                  leftIcon={<LogIn className="h-4 w-4" />}
                >
                  Sign In
                </Button>
              </Link>
              <Link href={ROUTES.chat}>
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Launch Assistant
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background-secondary px-4 py-4 space-y-3">
          <nav aria-label="Mobile navigation" className="flex flex-col space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-foreground-muted hover:text-primary hover:bg-background-tertiary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {!isLoading && isAuthenticated ? (
              <Link href={ROUTES.chat} onClick={() => setMobileOpen(false)}>
                <Button variant="primary" className="w-full">
                  Open Workspace
                </Button>
              </Link>
            ) : (
              <>
                <Link href={ROUTES.signIn} onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href={ROUTES.chat} onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Launch Assistant
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

