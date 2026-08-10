import Link from "next/link";
import { notFound } from "next/navigation";
import { getBySlug, getPrevNext, imgSrc, trilobites } from "../../../lib/trilobites";

export function generateStaticParams() {
  return trilobites.map((t) => ({ slug: t.slug }));
}

export default function SpeciesPage({ params }: { params: { slug: string } }) {
  const t = getBySlug(params.slug);
  if (!t) notFound();
  const { prev, next } = getPrevNext(t.slug);

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
              alt={`${t.scientific_name} — photo ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
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
  );
}
