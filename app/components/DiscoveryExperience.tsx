"use client";

import { useEffect, useRef } from "react";

const GUMROAD_URL = "https://chenyang84.gumroad.com/l/zcwtre";

/**
 * DiscoveryExperience — the Discovery canvas.
 *
 * The Triassic Sea is a pre-rendered, looping video (title and species cards
 * are burned into the frames). The shop card floats top-right and links to the
 * Gumroad checkout. No WebGL is loaded on this route anymore.
 */
export default function DiscoveryExperience() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Respect reduced-motion: hold on the poster instead of looping the clip.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.currentTime = 0;
    }
  }, []);

  return (
    <main className="abyss-main" aria-label="Deep time discovery canvas">
      {/* Blurred, cover-fit copy fills the panel so the 16:9 clip has no letterbox void. */}
      <video
        className="discovery-video-bg"
        src="/discovery/triassic-loop.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        aria-hidden="true"
      />
      <video
        ref={videoRef}
        className="discovery-video"
        src="/discovery/triassic-loop.mp4"
        poster="/discovery/triassic-loop-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />

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
