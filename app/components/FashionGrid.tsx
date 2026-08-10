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
        const haystack = [p.name, p.species, p.meta, p.origin, ...p.filters]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [products, filter, q]);

  return (
    <div className="fashion-grid-wrap">
      <div className="search-bar fashion-search">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fossil fashion..."
          className="search-bar__input"
          aria-label="Search fashion collection"
        />
      </div>

      <nav className="tag-scroll-row fashion-filters" aria-label="Filter fashion collection">
        {FASHION_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`tri-order-chip fashion-filter${filter === f ? " is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </nav>

      <div className="fashion-card-grid">
        {visible.map((p) => (
          <Link key={p.slug} href={`/fashion/${p.slug}`} className="fashion-card">
            <div className="fashion-card__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images.tee} alt={`${p.species} ${p.name} fossil t-shirt design`} loading="lazy" />
            </div>
            <div className="fashion-card__body">
              <div className="fashion-card__name">{p.name}</div>
              <div className="fashion-card__species">{p.species}</div>
              <div className="fashion-card__meta">{p.meta}</div>
            </div>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="tri-empty">
          <p>No pieces match your search.</p>
        </div>
      ) : null}
    </div>
  );
}
