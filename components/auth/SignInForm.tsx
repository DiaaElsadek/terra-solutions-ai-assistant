"use client";

import { useState, useEffect, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, AlertCircle, Info } from "lucide-react";
import { TerraMark } from "@/components/branding/TerraMark";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth/context";
import { ROUTES } from "@/constants/config";
import * as storage from "@/lib/storage/local-storage";

const REMEMBER_EMAIL_KEY = "terra_v1_remember_email";
const noopSubscribe = () => () => {};

/**
 * Sign In form using the temporary local authentication adapter.
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || ROUTES.chat;

  const { signIn, signUp, isAuthenticated, isLoading: authLoading } = useAuth();

  const rememberedEmail = useSyncExternalStore(
    noopSubscribe,
    () => storage.getItem<string>(REMEMBER_EMAIL_KEY, ""),
    () => ""
  );
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const email = emailInput ?? rememberedEmail;
  const setEmail = (val: string) => setEmailInput(val);

  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [authLoading, isAuthenticated, nextPath, router]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const emailTrimmed = email.trim();

    if (!emailTrimmed) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await signIn({
        email: email.trim(),
        password,
        rememberMe,
      });

      if (!result.success) {
        setFormError(result.error || "Sign in failed. Please check your credentials.");
        return;
      }

      if (rememberMe) {
        storage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        storage.removeItem(REMEMBER_EMAIL_KEY);
      }

      router.push(nextPath);
    } catch {
      setFormError("An unexpected error occurred while signing in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Convenience helper for evaluating the frontend-only workspace.
   * Creates or signs into a local demo agent profile in browser storage.
   */
  const handleDemoAgentSignIn = async () => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const demoEmail = "agent@terrasolutions.demo";
      const demoPass = "terra-demo-2026";
      const attempt = await signIn({
        email: demoEmail,
        password: demoPass,
        rememberMe: true,
      });
      if (attempt.success) {
        router.push(nextPath);
        return;
      }
      const created = await signUp({
        fullName: "Call Center Agent (Demo)",
        email: demoEmail,
        password: demoPass,
      });
      if (created.success) {
        router.push(nextPath);
      } else {
        setFormError(created.error || "Could not create demo account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-border bg-background-secondary p-6 sm:p-8 terra-subtle-shadow">
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo href="/" compact size="lg" priority className="mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Sign in to Terra Solutions Assistant
          </h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            Access your Call Center Knowledge Workspace
          </p>
        </div>

        {/* Honest local auth disclaimer */}
        <div
          role="note"
          className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs text-foreground-muted flex items-start gap-2.5"
        >
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong className="text-terra-gold-light">Demo Local Auth:</strong>{" "}
            Temporary frontend adapter stored in this browser only (SHA-256 hashed, not production auth).
          </span>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2.5"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Work Email"
            type="email"
            autoComplete="email"
            placeholder="agent@terrasolutions.me"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="inline-flex items-center gap-2 text-foreground-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-input-bg accent-primary"
              />
              Remember email on this device
            </label>

            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            onClick={handleDemoAgentSignIn}
            leftIcon={<TerraMark size="xs" variant="bare" />}
            className="w-full"
          >
            Quick Demo Agent Sign-In
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-foreground-muted">
          New to the team?{" "}
          <Link
            href={ROUTES.signUp}
            className="font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>

      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Password Reset (Local Session)"
        description="This preview uses browser-local storage without a remote email server."
      >
        <div className="space-y-4 text-sm text-foreground-muted">
          <p>
            Because no backend authentication provider is connected yet, password reset
            emails cannot be sent.
          </p>
          <p>
            To continue immediately, you can create a new account on the Sign Up page or use{" "}
            <strong className="text-foreground">Quick Demo Agent Sign-In</strong>.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setForgotOpen(false)}>
              Close
            </Button>
            <Link href={ROUTES.signUp} onClick={() => setForgotOpen(false)}>
              <Button variant="primary">Go to Sign Up</Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
