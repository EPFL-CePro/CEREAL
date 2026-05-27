import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import 'rsuite/dist/rsuite-no-reset.min.css';
import "./globals.css";
import { CustomProvider } from "rsuite";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CEREAL",
  description: "CEREAL (CePro Examens Regroupement Encadrement Administration Logistique), a tool for everything that concerns managing exams at CePro @EPFL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <CustomProvider>{children}</CustomProvider>
      </body>
    </html>
  );
}
