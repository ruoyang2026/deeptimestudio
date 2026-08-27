import SiteShell from "../components/SiteShell";
import DiscoveryArchive from "../components/DiscoveryArchive";

export const metadata = {
  title: "Trilobites of the World | 500+ Fossil Species Database & Paleo Visual Archive",
  description:
    "Explore 500+ trilobite species from the Cambrian to Permian periods. High-resolution fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
  openGraph: {
    type: "website",
    title: "Trilobites of the World | 500+ Fossil Species Database & Paleo Visual Archive",
    description:
      "Explore 500+ trilobite species from the Cambrian to Permian periods. High-resolution fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
    images: [{ url: "/trilobite-shop-cover.webp", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trilobites of the World | Deep Time Studio",
    description:
      "Explore 500+ trilobite species with fossil photographs, geological ages and scientific classification.",
    images: ["/trilobite-shop-cover.webp"],
  },
};

type PageProps = {
  searchParams?: {
    q?: string;
    order?: string;
    age?: string;
  };
};

export default function DiscoveryPage({ searchParams }: PageProps) {
  return (
    <SiteShell>
      <DiscoveryArchive
        q={searchParams?.q}
        order={searchParams?.order}
        age={searchParams?.age}
      />
    </SiteShell>
  );
}