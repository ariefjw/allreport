import type { Metadata } from "next";
import { Fira_Sans, Fira_Code, Fraunces } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AlarmProvider } from "@/components/providers/AlarmProvider";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-code",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Job Track Central",
  description: "Automated Job Monitoring & Reporting Application",
  icons: [{ rel: "icon", url: "/logo-monitoring.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${firaSans.variable} ${firaCode.variable} ${fraunces.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <AlarmProvider>
              <AppShell>{children}</AppShell>
            </AlarmProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
