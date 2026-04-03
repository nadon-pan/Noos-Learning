import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://noos-learning.vercel.app";

export const metadata = {
  title: { default: "Noos Learning — Wordle, but smarter", template: "%s | Noos Learning" },
  description: "Chat with an AI personality to extract clues and guess the mystery term. Pick any topic — history, science, pop culture — and outsmart the bot.",
  metadataBase: new URL(siteUrl),
  keywords: ["word game", "AI game", "wordle", "learning game", "educational game", "trivia", "clue game", "guessing game"],
  openGraph: {
    title: "Noos Learning — Wordle, but smarter",
    description: "Chat with an AI personality to extract clues and guess the mystery term. Pick any topic — history, science, pop culture — and outsmart the bot.",
    url: siteUrl,
    siteName: "Noos Learning",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Noos Learning — AI-powered word guessing game" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noos Learning — Wordle, but smarter",
    description: "Chat with an AI personality to extract clues and guess the mystery term.",
    images: ["/api/og"],
  },
  icons: {
    icon: "/nooslogo.svg",
    shortcut: "/nooslogo.svg",
  },
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        {/* Ambient light blobs — cinematic depth on all pages */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div style={{
            position: 'absolute', top: '-15%', right: '-10%',
            width: 'min(700px, 90vw)', height: 'min(700px, 90vw)', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(21,127,236,0.07) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', left: '-5%',
            width: 'min(600px, 80vw)', height: 'min(600px, 80vw)', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(94,120,163,0.05) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
