"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth/context";
import { ROUTES } from "@/constants/config";

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Sign Up form using the temporary local authentication adapter.
 */
export function SignUpForm() {
  const router = useRouter();
  const { signUp, isAuthenticated, isLoading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isSuccess) {
      router.replace(ROUTES.chat);
    }
  }, [authLoading, isAuthenticated, isSuccess, router]);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required.";
    } else if (fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }

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

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
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
      const result = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (!result.success) {
        setFormError(result.error || "Could not create account.");
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push(ROUTES.chat);
      }, 900);
    } catch {
      setFormError("An unexpected error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="terra-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo href="/" compact size="lg" priority className="mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Create Agent Account
          </h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            Register to access Terra Solutions Assistant
          </p>
        </div>

        <div
          role="note"
          className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs text-foreground-muted flex items-start gap-2.5"
        >
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong className="text-terra-gold-light">Local Browser Session:</strong>{" "}
            Account data is hashed (SHA-256) and stored on this device only. Plaintext passwords are never saved.
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

        {isSuccess ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center space-y-2"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Account created successfully
            </h2>
            <p className="text-xs text-foreground-muted">
              Redirecting you to Terra Solutions Assistant…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Sara Ahmed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fieldErrors.fullName}
              leftIcon={<User className="h-4 w-4" />}
              disabled={isSubmitting}
            />

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
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isSubmitting}
            />

            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Create Account
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground-muted">
          Already have an account?{" "}
          <Link
            href={ROUTES.signIn}
            className="font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

