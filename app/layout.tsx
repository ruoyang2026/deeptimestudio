import type { Metadata } from "next";
import Script from "next/script";
import "../styles/globals.css";
import { SITE_URL, SITE_NAME } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Trilobites of the World | 500+ Fossil Species Database & Paleo Visual Archive",
  description:
    "Explore 500+ trilobite species from the Cambrian to Permian periods. High-resolution fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: "Trilobites of the World | 500+ Fossil Species Database & Paleo Visual Archive",
    description:
      "Explore 500+ trilobite species from the Cambrian to Permian periods. High-resolution fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/trilobite-shop-cover.webp`, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trilobites of the World | Deep Time Studio",
    description:
      "Explore 500+ trilobite species with fossil photographs, geological ages and scientific classification.",
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
