import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export function hasRole(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

export function canAccessRoute(userRole: UserRole, href: string): boolean {
  const item = NAV_ROUTE_ROLES.find((r) => href.startsWith(r.href));
  if (!item) return true;
  return item.roles.includes(userRole);
}

const NAV_ROUTE_ROLES = [
  { href: "/dashboard", roles: ["OWNER", "KASIR", "GUDANG"] as UserRole[] },
  { href: "/pos", roles: ["OWNER", "KASIR"] as UserRole[] },
  { href: "/products", roles: ["OWNER", "GUDANG"] as UserRole[] },
  { href: "/categories", roles: ["OWNER", "GUDANG"] as UserRole[] },
  { href: "/units", roles: ["OWNER", "GUDANG"] as UserRole[] },
  { href: "/suppliers", roles: ["OWNER", "GUDANG"] as UserRole[] },
  { href: "/customers", roles: ["OWNER", "KASIR"] as UserRole[] },
  { href: "/purchases", roles: ["OWNER", "GUDANG"] as UserRole[] },
  { href: "/stock", roles: ["OWNER", "GUDANG"] as UserRole[] },
  { href: "/reports", roles: ["OWNER"] as UserRole[] },
  { href: "/settings", roles: ["OWNER"] as UserRole[] },
  { href: "/users", roles: ["OWNER"] as UserRole[] },
];
