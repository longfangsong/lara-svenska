import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  Button,
  DarkThemeToggle,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  ThemeModeScript,
} from "flowbite-react";
import { auth } from "@/app/auth";
import { SignInButton } from "@/app/_components/auth/SignInButton";
import { SignOutButton } from "@/app/_components/auth/SignOutButton";
const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Lära Svenska",
  description: "An app for learning Swedish by reading",
};

async function NavBar() {
  const session = await auth();
  return (
    <Navbar
      fluid
      className="items-center justify-between border-b border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
    >
      <NavbarBrand href={process.env.CF_PAGES_URL}>
        <span className="self-center whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-white">
          Lära Svenska
        </span>
      </NavbarBrand>
      <div className="flex flex-row justify-between items-center gap-2 md:order-2">
        <DarkThemeToggle />
        {session?.user ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-9 h-9 rounded"
              src={session.user?.image!}
              alt={session.user.name || ""}
            />
            <SignOutButton />
          </>
        ) : (
          <SignInButton />
        )}
      </div>
      <NavbarCollapse>
        <NavbarLink href={process.env.CF_PAGES_URL + "/articles"}>
          Articles
        </NavbarLink>
        {session?.user ? (
          <NavbarLink href={process.env.CF_PAGES_URL + "/words"}>
            Words
          </NavbarLink>
        ) : (
          <></>
        )}
      </NavbarCollapse>
    </Navbar>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      <body
        className={
          inter.className +
          " bg-white text-gray-600 antialiased dark:bg-gray-900 dark:text-gray-400"
        }
      >
        <NavBar />
        <main className="p-2 sm:p-4">{children}</main>
      </body>
    </html>
  );
}
