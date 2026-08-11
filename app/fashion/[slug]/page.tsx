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
    title: `${p.name} — 520 Million Year Old Trilobite Fossil T-Shirt | Deep Time Studio`,
    description:
      "A 520-million-year-old trilobite fossil becomes a statement graphic tee. Discover prehistoric fashion inspired by nature's original designs.",
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
        <Link href="/fossil-fashion-design-inspiration">Fossil Fashion</Link>
        <span className="tri-breadcrumb__sep">/</span>
        <span>Cambrian Collection</span>
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
          <div className="fashion-detail__meta">{p.meta}</div>

          <section className="fashion-detail__section">
            <h2 className="fashion-detail__kicker">The Story</h2>
            {p.story.map((para, i) => (
              <p key={i} className="fashion-detail__text">
                {para}
              </p>
            ))}
          </section>

          <section className="fashion-detail__section">
            <h2 className="fashion-detail__kicker">Design Philosophy</h2>
            {p.philosophy.map((para, i) => (
              <p key={i} className="fashion-detail__text">
                {para}
              </p>
            ))}
          </section>

          <section className="fashion-detail__section">
            <h2 className="fashion-detail__kicker">The Collection</h2>
            <div className="fashion-detail__drop">{p.collection.headline}</div>
            <p className="fashion-detail__text">{p.collection.blurb}</p>
            <p className="fashion-detail__text">{p.collection.blurb2}</p>
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
