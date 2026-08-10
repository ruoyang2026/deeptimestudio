import type { Metadata } from "next";
import Script from "next/script";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Trilobites of the World | 500+ Fossil Species Database & Paleo Visual Archive",
  description:
    "Explore 500+ trilobite species from the Cambrian to Permian periods. High-resolution fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Collection",
  name: "Illustration Guide to Trilobites — Visual Database",
  url: "https://www.socialalphas.com",
  description:
    "A visual database cataloguing 500+ trilobite species with classification, etymology, geological age, distribution and photographs.",
  knowsAbout: [
    "trilobites",
    "paleontology",
    "Cambrian",
    "Ordovician",
    "Silurian",
    "Devonian",
    "Arthropods",
    "fossils",
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
