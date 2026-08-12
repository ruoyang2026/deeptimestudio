import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "../components/SiteShell";
import { getUpdates, type UpdateEntry } from "../../lib/updates";
import { isDrillable } from "../../lib/trilobites";
import { getFashionBySlug } from "../../lib/fashion";

export const metadata: Metadata = {
  title: "What's New | Deep Time Studio — Trilobite Database Updates",
  description:
    "New trilobite species, newly added fossil photographs, and new fashion releases from Deep Time Studio — the latest additions to the 500+ species archive.",
  alternates: { canonical: "/updates" },
};

const KIND_LABEL: Record<UpdateEntry["kind"], string> = {
  species_added: "New species",
  images_added: "New photos",
  unlocked: "Unlocked",
  fashion_added: "New fashion",
};

function SpeciesList({ slugs }: { slugs: string[] }) {
  return (
    <ul className="upd-entry__list">
      {slugs.map((slug) =>
        isDrillable(slug) ? (
          <li key={slug}>
            <Link href={`/species/${slug}`}>{slug.replace(/-/g, " ")}</Link>
          </li>
        ) : (
          <li key={slug}>{slug.replace(/-/g, " ")}</li>
        )
      )}
    </ul>
  );
}

function FashionList({ slugs }: { slugs: string[] }) {
  return (
    <ul className="upd-entry__list">
      {slugs.map((slug) => {
        const p = getFashionBySlug(slug);
        const label = p ? p.name : slug.replace(/-/g, " ");
        return (
          <li key={slug}>
            <Link href={`/fashion/${slug}`}>{label}</Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function UpdatesPage() {
  const entries = getUpdates();

  return (
    <SiteShell>
      <div className="updates-page">
        <header className="updates-page__head">
          <h1 className="updates-page__title">What&apos;s New</h1>
          <p className="updates-page__sub">
            Every content change — new species, new fossil photographs, newly
            unlocked pages and fashion releases — is recorded here automatically.
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="tri-empty">
            <p>No updates recorded yet. New content will appear here after the next build.</p>
          </div>
        ) : (
          <ol className="upd-timeline">
            {entries.map((entry) => (
              <li key={entry.id} className="upd-entry">
                <div className="upd-entry__meta">
                  <span className="upd-entry__date">{entry.date}</span>
                  <span className={`upd-badge upd-badge--${entry.kind}`}>
                    {KIND_LABEL[entry.kind]}
                  </span>
                </div>
                <div className="upd-entry__body">
                  <p className="upd-entry__detail">
                    {entry.detail || `${entry.count} item${entry.count === 1 ? "" : "s"} updated`}
                  </p>
                  {entry.slugs && entry.slugs.length ? (
                    entry.kind === "fashion_added" ? (
                      <FashionList slugs={entry.slugs} />
                    ) : (
                      <SpeciesList slugs={entry.slugs} />
                    )
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </SiteShell>
  );
}
