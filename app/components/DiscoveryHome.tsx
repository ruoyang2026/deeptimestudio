"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import DiscoveryArchive from "./DiscoveryArchive";

const AbyssScene = dynamic(() => import("./AbyssScene"), {
  ssr: false,
  loading: () => <div className="abyss-scene abyss-scene--loading" />,
});

const AbyssFloatingCards = dynamic(() => import("./AbyssFloatingCards"), {
  ssr: false,
  loading: () => <div className="abyss-hero" />,
});

type Mode = "cambrian" | "archive";

export default function DiscoveryHome() {
  const [mode, setMode] = useState<Mode>("cambrian");

  return (
    <>
      <nav className="discovery-tabs" aria-label="Discovery view">
        <button
          type="button"
          className={`discovery-tabs__tab${mode === "cambrian" ? " is-active" : ""}`}
          onClick={() => setMode("cambrian")}
        >
          Cambrian
        </button>
        <button
          type="button"
          className={`discovery-tabs__tab${mode === "archive" ? " is-active" : ""}`}
          onClick={() => setMode("archive")}
        >
          Archive
        </button>
      </nav>

      {mode === "cambrian" ? (
        <main className="abyss-main" aria-label="Cambrian abyss theme page">
          <AbyssScene />
          <AbyssFloatingCards />
        </main>
      ) : (
        <Suspense fallback={<div className="tri-empty"><p>Loading archive...</p></div>}>
          <DiscoveryArchive />
        </Suspense>
      )}
    </>
  );
}