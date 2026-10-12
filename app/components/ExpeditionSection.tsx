"use client";

import { useState } from "react";
import Link from "next/link";
import { triassicMarine } from "../../lib/triassic-marine";
import { GUMROAD_VOL1_URL } from "../../lib/site";

type World = {
  id: string;
  name: string;
  status: "live" | "soon";
};

const WORLDS: World[] = [
  { id: "vol1", name: "Triassic Seas Vol. 1", status: "live" },
  { id: "vol2", name: "Triassic Seas Vol. 2", status: "soon" },
];

function previewFor(slug: string): string {
  const t = triassicMarine.find((s) => s.slug === slug);
  if (!t) return "";
  const hero = t.images.find((i) => i.file.includes("3d-hero"));
  if (hero) return `/${hero.file}`;
  const fallback = t.images.find((i) => i.file.endsWith("03.webp"));
  if (fallback) return `/${fallback.file}`;
  return t.cover ? `/${t.cover}` : "";
}

const PINNED = ["mixosaurus-cf", "lashanichthys-sui"];

function modelSpecies() {
  const withModel = triassicMarine.filter((t) => t.model_url);
  return [...withModel].sort((a, b) => {
    const ai = PINNED.indexOf(a.slug);
    const bi = PINNED.indexOf(b.slug);
    if (ai >= 0 || bi >= 0) {
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    }
    return a.scientific_name.localeCompare(b.scientific_name);
  });
}

export default function ExpeditionSection() {
  const [world, setWorld] = useState("vol1");
  const models = modelSpecies();
  const activeWorld = WORLDS.find((w) => w.id === world) ?? WORLDS[0];

  return (
    <section className="expedition" aria-label="The expedition so far">
      {/* 1. World tabs + counts */}
      <div className="expedition__topbar">
        <div className="expedition__tabs" role="tablist" aria-label="Worlds">
          {WORLDS.map((w) =>
            w.status === "live" ? (
              <button
                key={w.id}
                role="tab"
                aria-selected={world === w.id}
                className={`expedition__tab${world === w.id ? " is-active" : ""}`}
                onClick={() => setWorld(w.id)}
              >
                {w.name}
              </button>
            ) : (
              <span key={w.id} className="expedition__tab is-disabled" aria-disabled="true">
                {w.name} · Soon
              </span>
            )
          )}
        </div>
        <div className="expedition__counts">
          <span>1 world</span>
          <span aria-hidden="true">·</span>
          <span>{models.length} species models</span>
        </div>
      </div>

      {/* 2. Scene cards for active world */}
      {activeWorld.id === "vol1" ? (
        <div className="expedition__scenes">
          <a
            className="scene-card"
            href={GUMROAD_VOL1_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="scene-card__cover"
              src="/expedition/vol1-experience.webp"
              alt="Experience Pack — Triassic seascape with Mixosaurus and Lashanichthys"
              loading="lazy"
              decoding="async"
            />
            <span className="scene-card__body">
              <span className="scene-card__title">
                Experience Pack <span className="scene-card__badge">Vol. 1</span>
              </span>
              <span className="scene-card__desc">
                Mixosaurus hunting a Lashanichthys school — both in 1:1 3D.
              </span>
              <span className="scene-card__meta">Interactive demo included</span>
              <span className="scene-card__btn">$19.99 — Own Vol. 1</span>
            </span>
          </a>

          <div className="scene-card is-disabled" aria-disabled="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="scene-card__cover"
              src="/expedition/vol2-full.webp"
              alt="Full Pack preview — Triassic marine fauna"
              loading="lazy"
              decoding="async"
            />
            <span className="scene-card__body">
              <span className="scene-card__title">
                Full Pack <span className="scene-card__badge is-soon">Coming soon</span>
              </span>
              <span className="scene-card__desc">
                Full fauna — 6 fishes + 3 marine reptiles (in production).
              </span>
              <span className="scene-card__btn is-disabled">Coming soon</span>
            </span>
          </div>
        </div>
      ) : null}

      {/* 3. Species grid — vertical preview cards, wraps to multiple rows */}
      <div className="expedition__grid">
        {models.map((t) => (
          <Link key={t.id} href={`/triassic-marine/${t.slug}`} className="species-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="species-card__cover"
              src={previewFor(t.slug)}
              alt={`${t.scientific_name} — 3D reconstruction preview`}
              loading="lazy"
              decoding="async"
            />
            <span className="species-card__body">
              <span className="species-card__name">{t.scientific_name}</span>
              <span className="species-card__sub">
                {t.order ? `${t.order} · ` : ""}3D
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
