import SiteShell from "../../components/SiteShell";
import TriassicMarineArchive from "../../components/TriassicMarineArchive";

export const metadata = {
  title: "Triassic Marine Reptiles | 10 Species Database & Paleo Visual Archive",
  description:
    "Explore 10 Triassic marine reptile species from the Luoping Biota (ichthyosaurs, sauropterygians, protorosaurs). Fossil photographs, classification, and geological data for research and paleo art.",
  openGraph: {
    type: "website",
    title: "Triassic Marine Reptiles | 10 Species Database & Paleo Visual Archive",
    description:
      "Explore 10 Triassic marine reptile species with fossil photographs, geological ages and scientific classification.",
    images: [{ url: "/trilobite-shop-cover.webp", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Triassic Marine Reptiles | Deep Time Studio",
    description:
      "Explore 10 Triassic marine reptile species with fossil photographs, geological ages and scientific classification.",
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

export default function TriassicMarineArchivePage({ searchParams }: PageProps) {
  return (
    <SiteShell>
      <TriassicMarineArchive
        q={searchParams?.q}
        order={searchParams?.order}
        age={searchParams?.age}
      />
    </SiteShell>
  );
}