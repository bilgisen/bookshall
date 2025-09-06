import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/provider";
import { Providers } from "../providers";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
export const metadata: Metadata = {
  title: "BooksHall - Book Management Platform",
  description:
    "Transform your book into a stunning digital and audio version with our intuitive platform. Experience high standards, user-friendly interface, AI-powered content editor, and much more for global platforms.",
  openGraph: {
    title: "BooksHall - Book Management Platform",
    description: "Transform your book into a stunning digital and audio version with our intuitive platform. Experience high standards, user-friendly interface, AI-powered content editor, and much more for global platforms.",
    url: "BooksHall.com",
    siteName: "BooksHall - Book Management Platform",
    images: [
      {
        url: "https://jdj14ctwppwprnqu.public.blob.vercel-storage.com/nsk-w9fFwBBmLDLxrB896I4xqngTUEEovS.png",
        width: 1200,
        height: 630,
        alt: "BooksHall - Book Management Platform",
      },
    ],
    locale: "en-US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body >
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            forcedTheme="dark"
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
