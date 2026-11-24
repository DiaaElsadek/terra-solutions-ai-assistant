import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { BRAND, NAV_LINKS } from "@/constants/brand";
import { ROUTES } from "@/constants/config";

/**
 * Marketing footer using strictly verified company information.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand column */}
          <div className="space-y-3">
            <BrandLogo href={ROUTES.home} subtitle="Internal Knowledge Hub" />
            <p className="text-sm text-foreground-muted max-w-xs leading-relaxed">
              Call Center, Chat Support &amp; BPO Services in Egypt. Empowering support teams with verified product and clinical knowledge.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-display text-sm font-semibold text-terra-gold-light uppercase tracking-wider mb-3">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground-muted hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={ROUTES.chat}
                  className="text-foreground-muted hover:text-primary transition-colors"
                >
                  AI Knowledge Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Access */}
          <div>
            <h3 className="font-display text-sm font-semibold text-terra-gold-light uppercase tracking-wider mb-3">
              Agent Access
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={ROUTES.signIn}
                  className="text-foreground-muted hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.signUp}
                  className="text-foreground-muted hover:text-primary transition-colors"
                >
                  Create Agent Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-foreground-muted/70">
          <p>{BRAND.copyright}</p>
          <p>Internal Call Center &amp; Customer Support Knowledge Platform</p>
        </div>
      </div>
    </footer>
  );
}

