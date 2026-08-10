import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FashionGallery from "../../components/FashionGallery";
import { fashionProducts, getFashionBySlug } from "../../../lib/fashion";

export const dynamicParams = false;

export function generateStaticParams() {
  return fashionProducts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getFashionBySlug(params.slug);
  if (!p) return {};
  return {
    title: `${p.species} Fossil T-Shirt | Deep Time Studio`,
    description: `${p.specimen}`,
    alternates: { canonical: `/fashion/${p.slug}` },
  };
}

export default function FashionDetailPage({ params }: { params: { slug: string } }) {
  const p = getFashionBySlug(params.slug);
  if (!p) notFound();
  const archiveHref = `/?q=${encodeURIComponent(p.species)}`;

  return (
    <main className="page-shell fashion-detail-page">
      <nav className="tri-breadcrumb">
        <Link href="/fossil-fashion-design-inspiration">All fashion</Link>
        <span className="tri-breadcrumb__sep">/</span>
        <span>Cambrian collection</span>
        <span className="tri-breadcrumb__sep">/</span>
        <span>{p.name}</span>
      </nav>

      <div className="fashion-detail__layout">
        <div className="fashion-detail__media">
          <FashionGallery images={p.gallery} alt={`${p.species} ${p.name}`} />
        </div>

        <div className="fashion-detail__info">
          <h1 className="fashion-detail__name">{p.name}</h1>
          <div className="fashion-detail__species">{p.species}</div>
          <div className="fashion-detail__meta">
            {p.meta} · {p.origin}
          </div>

          <section className="fashion-detail__section">
            <h2 className="fashion-detail__kicker">The Specimen</h2>
            <p className="fashion-detail__text">{p.specimen}</p>
          </section>

          <section className="fashion-detail__section">
            <h2 className="fashion-detail__kicker">Design Philosophy</h2>
            <p className="fashion-detail__text">{p.philosophy}</p>
          </section>

          <section className="fashion-detail__section">
            <h2 className="fashion-detail__kicker">Collection</h2>
            <div className="fashion-detail__drop">{p.collection.headline}</div>
            <dl className="fashion-detail__specs">
              {p.collection.specs.map((s) => (
                <div key={s.label} className="fashion-detail__spec">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <nav className="fashion-detail__nav">
            <Link href="/fossil-fashion-design-inspiration">
              ← Back to Fossil Fashion Collection
            </Link>
            <Link href={archiveHref}>View Scientific Database Entry →</Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
