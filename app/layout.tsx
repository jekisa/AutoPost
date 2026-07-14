import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoPost",
  description: "Instagram Auto-Post App"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <Link href="/" className="text-xl font-semibold text-ink">
                AutoPost
              </Link>
              {session ? (
                <nav className="flex items-center gap-2 text-sm">
                  <Link className="rounded-md px-3 py-2 hover:bg-stone-100" href="/">
                    Dashboard
                  </Link>
                  <Link className="rounded-md px-3 py-2 hover:bg-stone-100" href="/compose">
                    Compose
                  </Link>
                  <Link className="rounded-md px-3 py-2 hover:bg-stone-100" href="/settings">
                    Settings
                  </Link>
                </nav>
              ) : null}
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
