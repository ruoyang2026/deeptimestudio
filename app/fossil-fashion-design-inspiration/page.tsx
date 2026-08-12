import type { Metadata } from "next";
import SiteShell from "../components/SiteShell";
import FashionGrid from "../components/FashionGrid";
import { fashionProducts } from "../../lib/fashion";
import { SITE_URL, SITE_NAME } from "../../lib/site";

export const metadata: Metadata = {
  title: "Fossil Fashion Collection | Deep Time Studio — Trilobite T-Shirt Designs",
  description:
    "Paleo art meets fashion: prehistoric clothing and fossil t-shirt designs inspired by Cambrian trilobites, sacred geometry and natural history art.",
  alternates: { canonical: "/fossil-fashion-design-inspiration" },
  openGraph: {
    type: "website",
    title: "Fossil Fashion Collection | Deep Time Studio",
    description:
      "Paleo art meets fashion: prehistoric clothing and fossil t-shirt designs inspired by Cambrian trilobites.",
    url: `${SITE_URL}/fossil-fashion-design-inspiration`,
    siteName: SITE_NAME,
    locale: "en_US",
    images: [{ url: `${SITE_URL}/fashion/tee-eoredlichia.webp`, width: 900, height: 900, alt: "Fossil Fashion Collection" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fossil Fashion Collection | Deep Time Studio",
    description:
      "Paleo art meets fashion: prehistoric clothing and fossil t-shirt designs.",
    images: [`${SITE_URL}/fashion/tee-eoredlichia.webp`],
  },
};

export default function FashionHomePage() {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/fossil-fashion-design-inspiration#collection`,
    url: `${SITE_URL}/fossil-fashion-design-inspiration`,
    name: "Fossil Fashion Collection",
    description:
      "Paleo art meets fashion: prehistoric clothing and fossil t-shirt designs inspired by Cambrian trilobites, sacred geometry and natural history art.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: fashionProducts.length,
      itemListElement: fashionProducts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: `${SITE_URL}/fashion/${p.slug}`,
      })),
    },
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <div className="fashion-home">
        <h1 className="fashion-home__title">Fossil Fashion Collection</h1>
        <FashionGrid products={fashionProducts} />
      </div>
    </SiteShell>
  );
}
