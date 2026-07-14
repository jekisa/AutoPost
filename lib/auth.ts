import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = process.env.ADMIN_EMAIL?.trim();
        const password = process.env.ADMIN_PASSWORD?.trim();
        const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();

        if (!email || (!password && !passwordHash) || !credentials?.email || !credentials.password) {
          return null;
        }

        const validEmail = credentials.email.trim().toLowerCase() === email.toLowerCase();
        const credentialPassword = credentials.password.trim();
        const validPassword = password
          ? credentialPassword === password
          : await bcrypt.compare(credentialPassword, passwordHash as string);

        if (!validEmail || !validPassword) {
          return null;
        }

        return { id: "admin", email };
      }
    })
  ]
};
