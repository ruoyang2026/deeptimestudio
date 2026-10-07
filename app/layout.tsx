import type { Metadata } from "next";
import Script from "next/script";
import "../styles/globals.css";
import { SITE_URL, SITE_NAME } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Deep Time Studio | Interactive 3D Trilobite & Ammonite Fossils",
  description:
    "Explore trilobites & ammonites in interactive 3D — 1:1 scale ancient seas, right in your browser. Food webs, fossil guides & build-your-own-world for kids, classrooms & fossil lovers.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: "Deep Time Studio | Interactive 3D Trilobite & Ammonite Fossils",
    description:
      "Explore trilobites & ammonites in interactive 3D — 1:1 scale ancient seas, right in your browser. Food webs, fossil guides & build-your-own-world for kids, classrooms & fossil lovers.",
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/trilobite-shop-cover.webp`, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deep Time Studio | Interactive 3D Trilobite & Ammonite Fossils",
    description:
      "Explore trilobites & ammonites in interactive 3D — 1:1 scale ancient seas, right in your browser. Food webs, fossil guides & build-your-own-world for kids, classrooms & fossil lovers.",
    images: [`${SITE_URL}/trilobite-shop-cover.webp`],
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "A visual archive of 500+ trilobite species with fossil photographs, geological ages and scientific classification.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6135524846646839"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="7848ff99-fcd0-4682-ac62-2495b27f4dc5"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
