"use client";

import { useEffect, useRef, useState } from "react";
import { media } from "../../lib/media";
import ExpeditionSection from "./ExpeditionSection";

const HERO_VIDEO = media("/discovery/triassic-loop.mp4");
const HERO_POSTER = media("/discovery/hero-poster.webp");

/**
 * DiscoveryExperience — the Discovery canvas.
 *
 * Layered loading: poster first (LCP) with a 3s countdown, then the looping
 * video fades in. The poster holds a minimum of 3s; if the video needs longer,
 * the poster stays until canplay. Reduced-motion users stay on the poster.
 */
export default function DiscoveryExperience() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(3);

  useEffect(() => {
    const video = videoRef.current;
    if (video && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.load();
    }
    const t = window.setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          window.clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const show = ready && count === 0;

  return (
    <>
      <main className="abyss-main" aria-label="Deep time discovery canvas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`discovery-poster${show ? " is-hidden" : ""}`}
        src={HERO_POSTER}
        alt=""
        aria-hidden="true"
      />
      <video
        ref={videoRef}
        className={`discovery-video${show ? " is-ready" : ""}`}
        src={HERO_VIDEO}
        poster={HERO_POSTER}
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
      {count > 0 ? (
        <div className="discovery-countdown" aria-hidden="true">
          {count}
        </div>
      ) : null}

      <a
        className="discovery-cta"
        href="/demo"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Explore your own world — open the interactive demo in a new tab"
      >
        Explore Your Own World
      </a>

        <div className={`hero-caption${show ? " is-hidden" : ""}`}>
          <h1 className="hero-caption__title">Dive into a 240-million-year-old ocean</h1>
          <p className="hero-caption__sub">
            Build your own Triassic seafloor — no code required.
          </p>
        </div>

        {!show ? (
          <p className="discovery-loading">Diving into the Triassic ocean…</p>
        ) : null}
      </main>

      <ExpeditionSection />
    </>
  );
}
