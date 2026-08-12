"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SHOP_URL } from "../../lib/site";

export type CardData = {
  id: string;
  slug: string;
  order: string;
  scientificName: string;
  age: string;
  distribution: string;
  cover: string;
  alt: string;
  drillable: boolean;
};

export default function TrilobiteGrid({ species }: { species: CardData[] }) {
  const [lockedSlug, setLockedSlug] = useState<string | null>(null);
  const locked = lockedSlug ? species.find((s) => s.slug === lockedSlug) : null;

  useEffect(() => {
    if (!lockedSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLockedSlug(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockedSlug]);

  return (
    <>
      <div className="trilobite-card-grid">
        {species.map((t) =>
          t.drillable ? (
            <Link key={t.id} href={`/species/${t.slug}`} className="trilobite-card">
              <CardBody t={t} />
            </Link>
          ) : (
            <button
              key={t.id}
              type="button"
              className="trilobite-card is-locked"
              onClick={() => setLockedSlug(t.slug)}
            >
              <CardBody t={t} locked />
            </button>
          )
        )}
      </div>

      {locked ? (
        <div className="lock-modal-overlay" onClick={() => setLockedSlug(null)}>
          <div className="lock-modal" role="dialog" aria-modal="true" aria-label="Locked species" onClick={(e) => e.stopPropagation()}>
            <div className="lock-modal__icon">🔒</div>
            <h3 className="lock-modal__title">Locked</h3>
            <p className="lock-modal__text">
              Browse our{" "}
              <a
                className="lock-modal__link"
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                shop website
              </a>{" "}
              to unlock this species.
            </p>
            <p className="lock-modal__species">{locked.scientificName}</p>
            <button type="button" className="lock-modal__btn" onClick={() => setLockedSlug(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CardBody({ t, locked }: { t: CardData; locked?: boolean }) {
  return (
    <>
      <div className="card-img">
        {t.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.cover} alt={t.alt} loading="lazy" />
        ) : null}
        {locked ? <span className="lock-badge">Locked</span> : null}
      </div>
      <div className="card-text">
        <div className="order-name">{t.order}</div>
        <h4 className="species-name">{t.scientificName}</h4>
        <p className="loc-age">
          {t.age ? <span className="loc-age__age">{t.age}</span> : null}
          {t.distribution ? <span className="loc-age__place">{t.distribution}</span> : null}
        </p>
      </div>
    </>
  );
}
