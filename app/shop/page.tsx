import SiteShell from "../components/SiteShell";
import ShopGrid, { SHOP_ALL, shopProductJsonLd } from "../components/ShopGrid";
import { SITE_URL, SITE_NAME } from "../../lib/site";

export const metadata = {
  title: "Shop Fossil Packs, Units & Visual Databases | Deep Time Studio",
  description:
    "Fossil units for kids (NGSS 3-LS4-1, Grades 3–5), an interactive 3D Triassic ocean, and rare fossil visual databases for collectors and paleo artists. Instant download on Gumroad.",
  openGraph: {
    type: "website",
    title: "Shop Fossil Packs, Units & Visual Databases | Deep Time Studio",
    description:
      "Fossil units for kids, an interactive 3D Triassic ocean, and rare fossil visual databases. Instant download on Gumroad.",
    images: [{ url: "/trilobite-shop-cover.webp", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop | Deep Time Studio",
    description:
      "Fossil units for kids, an interactive 3D Triassic ocean, and rare fossil visual databases. Instant download on Gumroad.",
    images: ["/trilobite-shop-cover.webp"],
  },
};

export default function ShopPage() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/shop#products`,
    url: `${SITE_URL}/shop`,
    name: "Shop Fossil Packs, Units & Visual Databases",
    description:
      "Fossil units for kids, an interactive 3D Triassic ocean, and rare fossil visual databases for collectors and paleo artists.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    numberOfItems: SHOP_ALL.length,
    itemListElement: SHOP_ALL.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: shopProductJsonLd(p),
    })),
  };

  return (
    <SiteShell>
      <div className="page-shell">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
        <header className="hero">
          <p className="section-kicker">Shop · Fossil packs &amp; visual databases</p>
          <h1>Real fossils. Ready to teach, collect, and create.</h1>
          <p className="hero__text">
            Every pack is built on real fossil evidence — NGSS-aligned units for kids, and rare specimen
            photography for collectors and artists. Instant download, secure checkout on Gumroad.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
            <a
              href="#free-coloring"
              style={{
                display: "inline-block",
                padding: "13px 24px",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 700,
                background: "#e85d75",
                color: "#fff",
              }}
            >
              Start free — 3 coloring pages
            </a>
            <a
              href="#shop-databases"
              style={{
                display: "inline-block",
                padding: "13px 24px",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 700,
                background: "transparent",
                color: "#e2e8f0",
                border: "1px solid rgba(148, 163, 184, 0.25)",
              }}
            >
              Browse the visual databases
            </a>
          </div>
        </header>
        <ShopGrid />
      </div>
    </SiteShell>
  );
}
