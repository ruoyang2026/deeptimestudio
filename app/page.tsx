import dynamic from "next/dynamic";
import SiteShell from "./components/SiteShell";

// Three.js 海底场景 (客户端渲染, 禁用 SSR)
const AbyssScene = dynamic(() => import("./components/AbyssScene"), {
  ssr: false,
  loading: () => <div className="abyss-scene abyss-scene--loading" />,
});

const AbyssFloatingCards = dynamic(() => import("./components/AbyssFloatingCards"), {
  ssr: false,
  loading: () => <div className="abyss-hero" />,
});

export const metadata = {
  title: "Cambrian Explosion 3D: Anomalocaris, Trilobites & Fossils",
  description:
    "Explore the Cambrian Explosion in 3D. Meet Anomalocaris, trilobites & Burgess Shale predators in an interactive prehistoric ocean. Browse 500+ fossil species.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "The Cambrian Explosion in 3D",
      description:
        "Explore the Cambrian Explosion in 3D. Meet Anomalocaris, trilobites & Burgess Shale predators in an interactive prehistoric ocean.",
      about: [
        { "@type": "Thing", name: "Cambrian Explosion" },
        { "@type": "Thing", name: "Anomalocaris" },
        { "@type": "Thing", name: "Burgess Shale" },
        { "@type": "Taxon", name: "Trilobita" },
      ],
      temporalCoverage: "Cambrian",
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
        <main className="abyss-main" aria-label="Cambrian abyss theme page">
          <AbyssScene />
          <AbyssFloatingCards />
        </main>
      </SiteShell>
    </>
  );
}