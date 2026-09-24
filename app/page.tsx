import type { Metadata } from "next";
import SiteShell from "./components/SiteShell";
import DiscoveryExperience from "./components/DiscoveryExperience";

export const metadata: Metadata = {
  title: "Deep Time Studio | Scientifically Accurate Paleo 3D Assets & Digital Fossils",
  description:
    "Explore scientifically vetted prehistoric life in interactive Web 3D. True-to-scale paleo 3D assets, fossil specimens, and living reconstructions from the Cambrian to the Mesozoic.",
  keywords: [
    "paleo 3D models",
    "digital fossils",
    "prehistoric life reconstruction",
    "scientifically accurate 3D",
    "Cambrian explosion 3D",
    "Triassic marine reptiles",
    "fossil to life",
    "Three.js 3D museum",
  ],
  openGraph: {
    title: "Deep Time Studio | Interactive Paleo 3D & Digital Fossils",
    description:
      "From stone to life: Real-world scale prehistoric animals and fossil specimens in interactive Web 3D.",
    type: "website",
    images: [
      {
        url: "https://deep-time-studio.com/assets/preview/hero-nothosaurus-scale.jpg",
        width: 1200,
        height: 630,
        alt: "Deep Time Studio — scientifically accurate paleo 3D assets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deep Time Studio | Interactive Paleo 3D & Digital Fossils",
    description:
      "From stone to life: Real-world scale prehistoric animals and fossil specimens in interactive Web 3D.",
    images: ["https://deep-time-studio.com/assets/preview/hero-nothosaurus-scale.jpg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Deep Time Studio — Interactive Paleo 3D",
      description:
        "Explore scientifically vetted prehistoric life in interactive Web 3D. True-to-scale paleo 3D assets, fossil specimens and living reconstructions.",
      about: [
        { "@type": "Thing", name: "Paleo 3D reconstruction" },
        { "@type": "Thing", name: "Digital fossils" },
        { "@type": "Thing", name: "Triassic marine reptiles" },
        { "@type": "Taxon", name: "Nothosauria" },
        { "@type": "Taxon", name: "Ichthyosauria" },
      ],
      temporalCoverage: ["Cambrian", "Mesozoic"],
    },
    {
      "@type": "Organization",
      name: "Deep Time Studio",
      description: "Paleo visual archive and interactive prehistoric experiences",
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteShell>
        <DiscoveryExperience />
      </SiteShell>
    </>
  );
}