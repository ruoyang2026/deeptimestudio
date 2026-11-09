import SiteShell from "../../components/SiteShell";
import AmmonitesArchive from "../../components/AmmonitesArchive";

export const metadata = {
  title: "Ammonites of the World | 31 Species Database & Paleo Visual Archive",
  description:
    "Explore 31 ammonite species from the Devonian to the Cretaceous. Fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
  openGraph: {
    type: "website",
    title: "Ammonites of the World | 31 Species Database & Paleo Visual Archive",
    description:
      "Explore 31 ammonite species with fossil photographs, geological ages and scientific classification.",
    images: [{ url: "/trilobite-shop-cover.webp", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ammonites of the World | Deep Time Studio",
    description:
      "Explore 31 ammonite species with fossil photographs, geological ages and scientific classification.",
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

export default function AmmoniteArchivePage({ searchParams }: PageProps) {
  return (
    <SiteShell>
      <AmmonitesArchive
        q={searchParams?.q}
        order={searchParams?.order}
        age={searchParams?.age}
      />
    </SiteShell>
  );
}
