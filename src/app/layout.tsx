import type { Metadata } from "next";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { Inter } from 'next/font/google';
import { VerifierProvider } from "@/providers/VerifierProvider";

const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = {
  title: "Rumby Verifier",
  description: "Verify Rumby results",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className}`}
      >
        <VerifierProvider>
          <Layout>
            {children}
          </Layout>
        </VerifierProvider>
      </body>
    </html>
  );
}
