import SiteShell from "../../components/SiteShell";
import AmphibiansArchive from "../../components/AmphibiansArchive";

export const metadata = {
  title: "Fossil Amphibians of China | 8 Species Database & Paleo Visual Archive",
  description:
    "Explore 8 fossil amphibian species (frogs and toads) from the Cretaceous to the Pleistocene. Fossil photographs, classification, and geological data for research and paleo art.",
  openGraph: {
    type: "website",
    title: "Fossil Amphibians of China | 8 Species Database & Paleo Visual Archive",
    description:
      "Explore 8 fossil amphibian species with fossil photographs, geological ages and scientific classification.",
    images: [{ url: "/trilobite-shop-cover.webp", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fossil Amphibians | Deep Time Studio",
    description:
      "Explore 8 fossil amphibian species with fossil photographs, geological ages and scientific classification.",
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

export default function AmphibianArchivePage({ searchParams }: PageProps) {
  return (
    <SiteShell>
      <AmphibiansArchive
        q={searchParams?.q}
        order={searchParams?.order}
        age={searchParams?.age}
      />
    </SiteShell>
  );
}