import type { Metadata } from "next";
import Script from "next/script";
import "../styles/globals.css";
import { SITE_URL, SITE_NAME } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Trilobites of the World | 500+ Fossil Species Database & Paleo Visual Archive",
  description:
    "Explore 500+ trilobite species from the Cambrian to Permian periods. High-resolution fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
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
          data-website-id="4d21ea84-21cd-43f9-9eb7-645184ee2d01"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
