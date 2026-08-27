import SiteShell from "./components/SiteShell";
import DiscoveryHome from "./components/DiscoveryHome";

export const metadata = {
  title: "Cambrian Abyss | Deep Time Studio",
  description:
    "A living three-dimensional Cambrian sea — trilobites, jellyfish and the first life on Earth drifting through the dark water, with a floating archive of fossil species.",
};

export default function HomePage() {
  return (
    <SiteShell>
      <DiscoveryHome />
    </SiteShell>
  );
}