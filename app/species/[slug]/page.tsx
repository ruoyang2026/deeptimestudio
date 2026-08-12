import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getBySlug,
  getPrevNext,
  getCover,
  isDrillable,
  topPeriod,
  speciesImageAlt,
  imgSrc,
  SITE_URL,
  SITE_NAME,
  trilobites,
} from "../../../lib/trilobites";

export const dynamicParams = false;

export function generateStaticParams() {
  return trilobites.filter((t) => isDrillable(t.slug)).map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const t = getBySlug(params.slug);
  if (!t) return {};
  const period = topPeriod(t.age);
  const description = period
    ? `A ${period} trilobite species documented with fossil photographs and geological data.`
    : "A trilobite species documented with fossil photographs and geological data.";
  const cover = getCover(t);
  const ogImage = cover
    ? { url: `${SITE_URL}/${cover}`, alt: t.scientific_name }
    : { url: `${SITE_URL}/trilobite-shop-cover.webp`, alt: SITE_NAME };
  return {
    title: `${t.scientific_name} | Trilobites of the World`,
    description,
    alternates: { canonical: `/species/${t.slug}` },
    openGraph: {
      type: "article",
      title: `${t.scientific_name} | Trilobites of the World`,
      description,
      url: `${SITE_URL}/species/${t.slug}`,
      siteName: SITE_NAME,
      locale: "en_US",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${t.scientific_name} — Trilobite Fossil`,
      description,
      images: [ogImage.url],
    },
  };
}

export default function SpeciesPage({ params }: { params: { slug: string } }) {
  const t = getBySlug(params.slug);
  if (!t || !isDrillable(t.slug)) notFound();
  const { prev, next } = getPrevNext(t.slug);
  const period = topPeriod(t.age);
  const description = period
    ? `A ${period} trilobite species documented with fossil photographs and geological data.`
    : "A trilobite species documented with fossil photographs and geological data.";

  const pageUrl = `${SITE_URL}/species/${t.slug}`;
  const cover = getCover(t);
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    "@id": pageUrl,
    url: pageUrl,
    name: `${t.scientific_name} — Trilobite Fossil`,
    description,
    image: [
      ...(cover
        ? [{ "@type": "ImageObject", contentUrl: `${SITE_URL}/${cover}`, name: t.scientific_name }]
        : []),
      ...t.images.map((img, i) => ({
        "@type": "ImageObject",
        contentUrl: `${SITE_URL}${imgSrc(img.file)}`,
        name: speciesImageAlt(t.scientific_name, t.age, t.distribution),
        caption: `Photo ${i + 1}`,
      })),
    ],
    about: {
      "@type": "Taxon",
      name: t.scientific_name,
      parentTaxon: t.order,
    },
    temporalCoverage: period,
    isPartOf: {
      "@type": "WebSite",
      name: "Deep Time Studio",
      url: SITE_URL,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t.order,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: t.scientific_name,
        item: pageUrl,
      },
    ],
  };

  const rows: { label: string; value: string; full?: boolean }[] = [];
  if (t.classification) rows.push({ label: "Classification", value: t.classification, full: true });
  if (t.genus) rows.push({ label: "Genus", value: t.genus });
  if (t.genus_author) rows.push({ label: "Genus author", value: t.genus_author });
  if (t.genus_etymology) rows.push({ label: "Genus etymology", value: t.genus_etymology, full: true });
  if (t.species) rows.push({ label: "Species", value: t.species });
  if (t.species_author) rows.push({ label: "Species author", value: t.species_author });
  if (t.species_etymology) rows.push({ label: "Species etymology", value: t.species_etymology, full: true });
  if (t.age) rows.push({ label: "Age", value: t.age });
  if (t.distribution) rows.push({ label: "Distribution", value: t.distribution });
  if (t.synonyms) rows.push({ label: "Synonyms", value: t.synonyms, full: true });
  if (t.diagnosis) rows.push({ label: "Diagnosis", value: t.diagnosis, full: true });
  if (t.characters) rows.push({ label: "Characters", value: t.characters, full: true });
  if (t.remarks) rows.push({ label: "Remarks", value: t.remarks, full: true });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className="page-shell tri-detail">
      <nav className="tri-breadcrumb">
        <Link href="/">All trilobites</Link>
        <span className="tri-breadcrumb__sep">/</span>
        <span>{t.order}</span>
        <span className="tri-breadcrumb__sep">/</span>
        <span>{t.scientific_name}</span>
      </nav>

      <header className="tri-detail__hero">
        <div className="tri-detail__head">
          <div>
            <div className="tri-detail__order">{t.order}</div>
            <h1 className="tri-detail__title">{t.scientific_name}</h1>
            {t.classification ? (
              <p className="tri-detail__taxonomy">{t.classification}</p>
            ) : null}
          </div>
          <div className="tri-detail__chips">
            {t.age ? <span className="tri-chip">{t.age}</span> : null}
            {t.distribution ? <span className="tri-chip">{t.distribution}</span> : null}
          </div>
        </div>
      </header>

      <section className="tri-gallery">
        {t.images.map((img, i) => (
          <figure key={img.file} className="tri-gallery__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc(img.file)}
              alt={speciesImageAlt(t.scientific_name, t.age, t.distribution)}
              loading={i === 0 ? "eager" : "lazy"}
              width={img.width || undefined}
              height={img.height || undefined}
            />
            <figcaption>
              Photo {i + 1}
              {t.captions ? ` · ${t.captions}` : ""}
            </figcaption>
          </figure>
        ))}
      </section>

      <section className="tri-fields">
        {rows.map((row) => (
          <div key={row.label} className={`tri-field${row.full ? " tri-field--full" : ""}`}>
            <div className="tri-field__label">{row.label}</div>
            <div className="tri-field__value">{row.value}</div>
          </div>
        ))}
      </section>

      <nav className="tri-pager">
        {prev ? (
          <Link href={`/species/${prev.slug}`} className="tri-pager__btn">
            ← {prev.scientific_name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/species/${next.slug}`} className="tri-pager__btn">
            {next.scientific_name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
      </main>
    </>
  );
}
