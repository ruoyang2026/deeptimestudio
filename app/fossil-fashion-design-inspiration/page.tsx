import type { Metadata } from "next";
import SiteShell from "../components/SiteShell";
import FashionGrid from "../components/FashionGrid";
import { fashionProducts } from "../../lib/fashion";

export const metadata: Metadata = {
  title: "Fossil Fashion Collection | Deep Time Studio — Trilobite T-Shirt Designs",
  description:
    "Paleo art meets fashion: prehistoric clothing and fossil t-shirt designs inspired by Cambrian trilobites, sacred geometry and natural history art.",
  alternates: { canonical: "/fossil-fashion-design-inspiration" },
};

export default function FashionHomePage() {
  return (
    <SiteShell>
      <div className="fashion-home">
        <h1 className="fashion-home__title">Fossil Fashion Collection</h1>
        <FashionGrid products={fashionProducts} />
      </div>
    </SiteShell>
  );
}
