"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
}

/**
 * Reusable accessible Input component with optional password visibility toggle.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    label,
    error,
    helperText,
    leftIcon,
    type = "text",
    id: providedId,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-foreground-muted"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 text-foreground-subtle">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type={effectiveType}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={clsx(
            "w-full h-11 rounded-lg bg-input-bg border text-sm text-foreground placeholder:text-foreground-muted/50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring",
            leftIcon ? "pl-10" : "pl-3.5",
            isPassword ? "pr-10" : "pr-3.5",
            error
              ? "border-destructive focus:ring-destructive/40"
              : "border-border hover:border-border-hover focus:border-primary",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 p-1 text-foreground-muted hover:text-foreground transition-colors rounded focus-visible:outline-2 focus-visible:outline-ring"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-foreground-muted/70">{helperText}</p>
      ) : null}
    </div>
  );
});

