import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { AuthProvider } from "@/lib/auth/context";
import { AppEntranceLoader } from "@/components/branding/AppEntranceLoader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Terra Solutions Assistant | Terra Solutions",
    template: "%s | Terra Solutions Assistant",
  },
  description:
    "Internal knowledge assistant for Terra Solutions Call Center and Support teams. Access verified company products, clinic devices, offers, and safety rules.",
  icons: {
    icon: [{ url: "/images/T_logo.svg", type: "image/svg+xml" }],
    shortcut: "/images/T_logo.svg",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!sessionStorage.getItem('terra_v1_intro_shown')){document.documentElement.dataset.terraIntro='pending'}}catch{}",
          }}
        />
        <AuthProvider>
          <AppEntranceLoader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
