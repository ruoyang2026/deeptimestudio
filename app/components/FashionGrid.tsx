"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FASHION_FILTERS, type FashionProduct } from "../../lib/fashion";

export default function FashionGrid({ products }: { products: FashionProduct[] }) {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== "All" && !p.filters.includes(filter)) return false;
      if (query) {
        const haystack = [p.name, p.series, p.species, p.blurb, p.palette, ...p.tags]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [products, filter, q]);

  return (
    <div className="fashion-grid-wrap">
      <div className="fashion-search">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the collection..."
          aria-label="Search fashion collection"
        />
      </div>

      <div className="fashion-filters">
        {FASHION_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`fashion-filter${filter === f ? " is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="fashion-card-grid">
        {visible.map((p) => (
          <Link
            key={p.slug}
            href={`/fossil-fashion-design-inspiration/${p.slug}`}
            className="fashion-card"
          >
            <div className="fashion-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images.tee} alt={`${p.species} ${p.name} t-shirt`} loading="lazy" />
            </div>
            <div className="fashion-card__body">
              <div className="fashion-card__name">{p.name}</div>
              <div className="fashion-card__series">Series: {p.series}</div>
              <div className="fashion-card__species">{p.species}</div>
              <div className="fashion-card__meta">{p.meta}</div>
              <div className="fashion-card__blurb">{p.blurb}</div>
              <div className="fashion-card__palette">{p.palette}</div>
              <div className="fashion-card__tags">
                {p.tags.map((t) => `#${t}`).join(" ")}
              </div>
              <div className="fashion-card__cta">View the Artifact →</div>
            </div>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="fashion-empty">No pieces match your search.</div>
      ) : null}
    </div>
  );
}
