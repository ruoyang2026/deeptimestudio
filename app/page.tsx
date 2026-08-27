import dynamic from "next/dynamic";
import SiteShell from "./components/SiteShell";

// Three.js 海底场景 (客户端渲染, 禁用 SSR)
const AbyssScene = dynamic(() => import("./components/AbyssScene"), {
  ssr: false,
  loading: () => <div className="abyss-scene abyss-scene--loading" />,
});

const AbyssFloatingCards = dynamic(() => import("./components/AbyssFloatingCards"), {
  ssr: false,
  loading: () => <div className="abyss-hero" />,
});

export const metadata = {
  title: "Cambrian Abyss | Deep Time Studio",
  description:
    "A living three-dimensional Cambrian sea — trilobites, jellyfish and the first life on Earth drifting through the dark water, with a floating archive of fossil species.",
};

export default function HomePage() {
  return (
    <SiteShell>
      <main className="abyss-main" aria-label="Cambrian abyss theme page">
        <AbyssScene />
        <AbyssFloatingCards />
      </main>
    </SiteShell>
  );
}