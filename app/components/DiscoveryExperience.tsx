"use client";

import { useEffect, useRef, useState } from "react";

const GUMROAD_URL = "https://chenyang84.gumroad.com/l/zcwtre";

/**
 * DiscoveryExperience — the Discovery canvas.
 *
 * Layered loading: poster first (LCP), the looping video streams in after
 * first paint and fades in on canplay. Reduced-motion users stay on the poster.
 */
export default function DiscoveryExperience() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Defer the 15MB download until after first paint, out of LCP's way.
    const t = window.setTimeout(() => video.load(), 800);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="abyss-main" aria-label="Deep time discovery canvas">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`discovery-poster${ready ? " is-hidden" : ""}`}
        src="/discovery/hero-poster.webp"
        alt=""
        aria-hidden="true"
      />
      <video
        ref={videoRef}
        className={`discovery-video${ready ? " is-ready" : ""}`}
        src="/discovery/triassic-loop.mp4"
        poster="/discovery/hero-poster.webp"
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        onCanPlay={(e) => {
          setReady(true);
          e.currentTarget.play().catch(() => {});
        }}
      />
      {!ready ? (
        <p className="discovery-loading">Diving into the Triassic ocean…</p>
      ) : null}

      <a
        className="discovery-cta"
        href="#gallery"
        aria-label="Explore the Triassic ocean world"
      >
        Explore the Triassic Ocean World
      </a>

      <a
        className="discovery-card"
        href={GUMROAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Shop the collection — open the Gumroad page in a new tab"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="discovery-card__cover"
          src="/discovery/card-cretaceous.webp"
          alt="Explore the collection cover"
          loading="eager"
          decoding="async"
        />
        <span className="discovery-card__explore">Explore</span>
      </a>
    </main>
  );
}
