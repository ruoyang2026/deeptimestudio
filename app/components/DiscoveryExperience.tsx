"use client";

import { useEffect, useRef, useState } from "react";

const GUMROAD_URL = "https://chenyang84.gumroad.com/l/zcwtre";

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
          src="/discovery/hero-poster.webp"
          alt=""
          aria-hidden="true"
        />
        <video
          ref={videoRef}
          className={`discovery-video${show ? " is-ready" : ""}`}
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
        {count > 0 ? (
          <div className="discovery-countdown" aria-hidden="true">
            {count}
          </div>
        ) : null}

        <div className="hero-caption">
          <h1 className="hero-caption__title">Dive into a 240-million-year-old ocean</h1>
          <p className="hero-caption__sub">
            Build your own Triassic seafloor — no code required.
          </p>
        </div>

        {!show ? (
          <p className="discovery-loading">Diving into the Triassic ocean…</p>
        ) : null}
      </main>

      <section className="hero-below" aria-label="Collection">
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
            loading="lazy"
            decoding="async"
          />
          <span className="discovery-card__explore">Explore</span>
        </a>
      </section>
    </>
  );
}
