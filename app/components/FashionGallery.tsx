"use client";

import { useRef, useState } from "react";

type GalleryImage = { src: string; label: string };

export default function FashionGallery({
  images,
  alt,
}: {
  images: GalleryImage[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);

  function step(dir: 1 | -1) {
    setActive((i) => (i + dir + images.length) % images.length);
  }

  return (
    <div className="fashion-gallery">
      <div
        className="fashion-gallery__main"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active].src} alt={`${alt} — ${images[active].label}`} />
      </div>
      <div className="fashion-gallery__thumbs">
        {images.map((img, i) => (
          <button
            key={img.src + i}
            type="button"
            className={`fashion-gallery__thumb${i === active ? " is-active" : ""}`}
            onClick={() => setActive(i)}
            aria-label={img.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.label} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
