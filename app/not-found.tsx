import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
      <h1 className="font-display text-7xl font-bold text-primary mb-4">
        404
      </h1>
      <h2 className="text-xl font-medium text-foreground-muted mb-6">
        Page not found
      </h2>
      <p className="text-foreground-subtle mb-8 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
      >
        Return Home
      </Link>
    </div>
  );
}

