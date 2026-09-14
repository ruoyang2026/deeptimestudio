"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Three.js Cambrian seafloor scene (client only, no SSR)
const AbyssScene = dynamic(() => import("./AbyssScene"), {
  ssr: false,
  loading: () => <div className="abyss-scene abyss-scene--loading" />,
});

const AbyssFloatingCards = dynamic(() => import("./AbyssFloatingCards"), {
  ssr: false,
  loading: () => <div className="abyss-hero" />,
});

type Period = "cambrian" | "cretaceous";

const PERIODS: { id: Period; label: string }[] = [
  { id: "cambrian", label: "Cambrian" },
  { id: "cretaceous", label: "Cretaceous" },
];

/**
 * DiscoveryExperience — the Discovery canvas with a top period switcher.
 *
 *  - Cambrian   : the current procedural seafloor Three.js scene + floating cards
 *  - Cretaceous : an embedded recreation of the Sylva "living world" scene,
 *                 adapted for the Cretaceous (public/cretaceous/cretaceous-3d.html)
 */
export default function DiscoveryExperience() {
  const [period, setPeriod] = useState<Period>("cambrian");

  return (
    <main className="abyss-main" aria-label="Deep time discovery canvas">
      <div className="discovery-tabs" role="tablist" aria-label="Geological periods">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`tab-${p.id}`}
            aria-selected={period === p.id}
            aria-controls={`panel-${p.id}`}
            className={`discovery-tab${period === p.id ? " is-active" : ""}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "cambrian" ? (
        <div id="panel-cambrian" role="tabpanel" aria-labelledby="tab-cambrian">
          <AbyssScene />
          <AbyssFloatingCards />
        </div>
      ) : (
        <iframe
          id="panel-cretaceous"
          role="tabpanel"
          aria-labelledby="tab-cretaceous"
          className="cretaceous-frame"
          title="Cretaceous — Into the cretaceous world"
          src="/cretaceous/cretaceous-3d.html"
        />
      )}
    </main>
  );
}
