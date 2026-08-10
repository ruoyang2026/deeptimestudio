"use client";

import { useRef } from "react";

type Slide = { src: string; label: string };

export default function FashionCarousel({ slides }: { slides: Slide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="fashion-carousel">
      <div className="fashion-carousel__track" ref={trackRef}>
        {slides.map((s) => (
          <figure key={s.src + s.label} className="fashion-carousel__slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={s.label} loading={s.label === slides[0].label ? "eager" : "lazy"} />
            <figcaption>{s.label}</figcaption>
          </figure>
        ))}
      </div>
      <button type="button" className="fashion-carousel__nav is-prev" onClick={() => scrollBy(-1)} aria-label="Previous image">
        ←
      </button>
      <button type="button" className="fashion-carousel__nav is-next" onClick={() => scrollBy(1)} aria-label="Next image">
        →
      </button>
    </div>
  );
}
