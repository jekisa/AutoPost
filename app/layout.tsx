import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "AutoPost",
    template: "%s | AutoPost"
  },
  description: "Instagram Auto-Post App",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "AutoPost",
    description: "Instagram publishing cockpit for scheduled posts.",
    images: [
      {
        url: "/logo.svg",
        width: 320,
        height: 96,
        alt: "AutoPost logo"
      }
    ]
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-950 antialiased transition-colors dark:bg-slate-950 dark:text-slate-50">
        <Providers>
          <div className="min-h-screen">
            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-slate-50/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link href="/" className="group flex items-center rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950" aria-label="AutoPost dashboard">
                  <Image
                    src="/logo.svg"
                    alt="AutoPost"
                    width={160}
                    height={48}
                    priority
                    className="h-10 w-auto transition-transform group-hover:scale-[1.02] sm:h-11"
                  />
                </Link>
                <AppNav signedIn={Boolean(session)} userEmail={session?.user?.email ?? null} />
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
