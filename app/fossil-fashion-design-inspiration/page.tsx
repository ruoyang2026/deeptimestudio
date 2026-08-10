import type { Metadata } from "next";
import SiteShell from "../components/SiteShell";
import FashionGrid from "../components/FashionGrid";
import { fashionProducts } from "../../lib/fashion";

export const metadata: Metadata = {
  title: "Fossil Fashion Collection | Deep Time Studio — Wearable Cambrian Art",
  description:
    "Fashion designed by 520 million years of evolution. Wearable trilobite artifacts, sacred geometry and fossil-inspired streetwear from the Deep Time Studio archive.",
  alternates: { canonical: "/fossil-fashion-design-inspiration" },
};

export default function FashionHomePage() {
  return (
    <SiteShell>
      <div className="fashion-main">
        <header className="fashion-hero">
          <p className="fashion-hero__brand">Deep Time Studio</p>
          <h1 className="fashion-hero__title">Fossil Fashion Collection</h1>
          <p className="fashion-hero__tagline">
            Evolution is the greatest designer.
            <br />
            Nature was the first atelier.
          </p>
          <p className="fashion-hero__sub">
            Explore wearable artifacts from the Cambrian period. Each design is a collaboration
            between 520 million years of natural selection and contemporary visual culture.
          </p>
        </header>

        <FashionGrid products={fashionProducts} />
      </div>
    </SiteShell>
  );
}
