import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteShell from "../../components/SiteShell";
import FashionCarousel from "../../components/FashionCarousel";
import { fashionProducts, getFashionBySlug } from "../../../lib/fashion";
import { SHOP_URL } from "../../../lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return fashionProducts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getFashionBySlug(params.slug);
  if (!p) return {};
  return {
    title: `${p.species} ${p.name} | Fossil Fashion by Deep Time Studio`,
    description: `${p.blurb} ${p.palette}`,
    alternates: { canonical: `/fossil-fashion-design-inspiration/${p.slug}` },
  };
}

export default function FashionDetailPage({ params }: { params: { slug: string } }) {
  const p = getFashionBySlug(params.slug);
  if (!p) notFound();
  const archiveHref = `/?q=${encodeURIComponent(p.species)}`;

  return (
    <SiteShell>
      <div className="fashion-main fashion-detail">
        <section className="fashion-carousel-section">
          <FashionCarousel
            slides={[
              { src: p.images.tee, label: "T-Shirt Flat" },
              { src: p.images.model, label: "On Model" },
              { src: p.images.fossil, label: "Fossil Specimen" },
              { src: p.images.concept, label: "Concept" },
            ]}
          />
          <p className="fashion-carousel__caption">
            Swipe to examine the specimen
            <span>{p.carouselCaption}</span>
          </p>
        </section>

        <section className="fashion-section">
          <div className="fashion-kicker">The Specimen</div>
          <h2 className="fashion-section__species">{p.species}</h2>
          <p className="fashion-section__headline">{p.specimen.headline}</p>
          {p.specimen.paragraphs.map((para, i) => (
            <p key={i} className="fashion-section__body">
              {para}
            </p>
          ))}
          <h3 className="fashion-subhead">Key Features</h3>
          <dl className="fashion-specs">
            {p.specimen.features.map((f) => (
              <div key={f.label} className="fashion-spec">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="fashion-section">
          <div className="fashion-kicker">Design Philosophy</div>
          <h2 className="fashion-section__headline">{p.philosophy.headline}</h2>
          {p.philosophy.paragraphs.map((para, i) => (
            <p key={i} className="fashion-section__body">
              {para}
            </p>
          ))}
          <h3 className="fashion-subhead">{p.philosophy.whyTitle}</h3>
          <p className="fashion-section__body">{p.philosophy.whyBody}</p>
          <h3 className="fashion-subhead">{p.philosophy.messageTitle}</h3>
          {p.philosophy.messageParagraphs.map((para, i) => (
            <p key={i} className="fashion-section__body">
              {para}
            </p>
          ))}
          <h3 className="fashion-subhead">{p.philosophy.argumentTitle}</h3>
          <ul className="fashion-list">
            {p.philosophy.argumentItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="fashion-section">
          <div className="fashion-kicker">The Concept</div>
          <h2 className="fashion-section__headline">{p.concept.headline}</h2>
          {p.concept.paragraphs.map((para, i) => (
            <p key={i} className="fashion-section__body">
              {para}
            </p>
          ))}
          {p.concept.closingLines.map((line, i) => (
            <p key={i} className="fashion-section__closing">
              {line}
            </p>
          ))}
        </section>

        <section className="fashion-section">
          <div className="fashion-kicker">Color &amp; Texture</div>
          <h2 className="fashion-section__headline">{p.color.headline}</h2>
          {p.color.paragraphs.map((para, i) => (
            <p key={i} className="fashion-section__body">
              {para}
            </p>
          ))}
          <p className="fashion-section__closing">{p.color.closing}</p>
          <h3 className="fashion-subhead">Print Specs</h3>
          <dl className="fashion-specs">
            {p.color.specs.map((f) => (
              <div key={f.label} className="fashion-spec">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="fashion-section">
          <div className="fashion-kicker">Typography &amp; Form</div>
          <h2 className="fashion-section__headline">{p.typography.headline}</h2>
          {p.typography.paragraphs.map((para, i) => (
            <p key={i} className="fashion-section__body">
              {para}
            </p>
          ))}
          <p className="fashion-section__closing">{p.typography.closing}</p>
        </section>

        <section className="fashion-section">
          <div className="fashion-kicker">Collection</div>
          <h2 className="fashion-section__headline">{p.collection.headline}</h2>
          <p className="fashion-section__body">{p.collection.paragraph}</p>
          <p className="fashion-section__closing">{p.collection.limited}</p>
          <dl className="fashion-specs">
            {p.collection.specs.map((f) => (
              <div key={f.label} className="fashion-spec">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="fashion-nav">
          <Link href="/fossil-fashion-design-inspiration" className="fashion-nav__back">
            ← Back to Fossil Fashion Collection
          </Link>
          <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" className="fashion-nav__buy">
            View the Artifact →
          </a>
          <div className="fashion-nav__archive">
            Explore the Scientific Archive
            <Link href={archiveHref}>View the {p.species} database entry →</Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
