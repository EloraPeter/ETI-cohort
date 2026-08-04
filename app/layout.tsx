import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eloratechinstitute.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Web Development Cohort — September 2026 | Elora Tech Institute",
    template: "%s | Elora Tech Institute",
  },
  description:
    "Become a web developer in 7 weeks. Learn HTML, CSS, JavaScript, and how to build real websites with AI tools like ChatGPT, Claude, and DeepSeek — while understanding every line of code. September 2026 cohort, ₦250,000, limited slots.",
  keywords: [
    "Elora Tech Institute",
    "web development cohort Nigeria",
    "learn web development with AI",
    "HTML CSS JavaScript bootcamp",
    "ETI cohort September 2026",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Elora Tech Institute",
    title: "Become a Web Developer in Just 7 Weeks",
    description:
      "Master HTML, CSS, JavaScript, and AI-assisted development in ETI's September 2026 Web Development Cohort.",
    images: [{ url: "/og-cover.jpg", width: 1200, height: 630, alt: "Elora Tech Institute — Web Development Cohort" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Become a Web Developer in Just 7 Weeks",
    description: "HTML, CSS, JavaScript + AI-assisted development. September 2026 cohort. Limited slots.",
    images: ["/og-cover.jpg"],
  },
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
};

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Web Development Cohort — September 2026",
  description:
    "A 7-week live, practical web development program covering HTML, CSS, JavaScript, and AI-assisted development, run by Elora Tech Institute.",
  provider: {
    "@type": "Organization",
    name: "Elora Tech Institute",
    sameAs: siteUrl,
  },
  offers: {
    "@type": "Offer",
    price: "250000",
    priceCurrency: "NGN",
    availability: "https://schema.org/LimitedAvailability",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
