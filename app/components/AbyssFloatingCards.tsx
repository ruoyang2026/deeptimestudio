"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getCover, imgSrc, trilobites, speciesImageAlt, isDrillable } from "../../lib/trilobites";

type FloatCardData = {
  id: string;
  slug: string;
  scientificName: string;
  age: string;
  order: string;
  cover: string;
  alt: string;
  style: CSSProperties;
  className?: string;
};

/**
 * AbyssFloatingCards — 寒武纪海底主题浮动卡片层
 *
 * 复刻 threeui sylva/living-green 的浮动卡片机制:
 *  - 绝对定位的浮层卡片, 覆盖在 WebGL 场景之上
 *  - 指针视差 (--px/--py 变量驱动 transform)
 *  - CSS 浮动动画 (float 关键帧)
 *  - 数据来自 deeptimestudio 现有三叶虫库
 */
export default function AbyssFloatingCards() {
  const [cards, setCards] = useState<FloatCardData[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 用现有三叶虫库构造卡片
    const featured = trilobites.filter((t) => isDrillable(t.slug)).slice(0, 6);
    const list: FloatCardData[] = featured.map((t, i) => {
      const cover = getCover(t);
      const coverImg = cover
        ? t.images.find((im) => im.file === cover)
        : null;
      return {
        id: t.id,
        slug: t.slug,
        scientificName: t.scientific_name,
        age: t.age,
        order: t.order,
        cover: cover ? imgSrc(cover) : "",
        alt: speciesImageAlt(t.scientific_name, t.age, t.distribution),
        style: {
          "--c": String(i),
          "--c-inv": String(5 - i),
          "--d": `${600 + i * 180}ms`,
        } as CSSProperties,
        className: i % 2 === 0 ? "abyss-card--a" : "abyss-card--b",
      };
    });
    setCards(list);
  }, []);

  // 指针视差: 写入 --px/--py 到 hero, CSS 层做 transform
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const smooth = { x: 0, y: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      const tick = () => {
        smooth.x += (nx - smooth.x) * 0.06;
        smooth.y += (ny - smooth.y) * 0.06;
        hero.style.setProperty("--px", smooth.x.toFixed(4));
        hero.style.setProperty("--py", smooth.y.toFixed(4));
        raf = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="abyss-hero" ref={heroRef}>
      {/* 大标题浮层 */}
      <header className="abyss-headline">
        <p className="abyss-headline__kicker">Deep Time Studio · Cambrian</p>
        <h1 className="abyss-headline__title">
          <span className="abyss-headline__ghost">ABYSS</span>
        </h1>
        <p className="abyss-headline__lede">
          Step into the Cambrian sea. A living archive of the oldest life on Earth —
          trilobites, jellyfish and the first predators, drifting in the dark.
        </p>
      </header>

      {/* 浮动卡片 */}
      {cards.map((c) => (
        <Link
          key={c.id}
          href={`/species/${c.slug}`}
          className={`abyss-card ${c.className || ""}${c.cover ? "" : " is-empty"}`}
          style={c.style}
        >
          <span className="abyss-card__media">
            {c.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.cover} alt={c.alt} loading="lazy" />
            ) : null}
          </span>
          <span className="abyss-card__order">{c.order}</span>
          <span className="abyss-card__name">{c.scientificName}</span>
          <span className="abyss-card__age">{c.age}</span>
        </Link>
      ))}

      {/* 底部入场引导 */}
      <div className="abyss-scroll">
        <span className="abyss-scroll__line" />
        <span className="abyss-scroll__label">Discover the archive</span>
      </div>
    </div>
  );
}