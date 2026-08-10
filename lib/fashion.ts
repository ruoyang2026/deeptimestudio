export const FASHION_FILTERS = [
  "All",
  "Cambrian",
  "Ordovician",
  "Silurian",
  "Devonian",
  "Sacred Geometry",
  "Extinct Icons",
];

export type FashionProduct = {
  slug: string;
  name: string;
  species: string;
  series: string;
  meta: string;
  origin: string;
  filters: string[];
  images: {
    tee: string;
    model: string;
    fossil: string;
    detail: string;
  };
  gallery: { src: string; label: string }[];
  specimen: string;
  philosophy: string;
  collection: {
    headline: string;
    specs: { label: string; value: string }[];
  };
};

export const fashionProducts: FashionProduct[] = [
  {
    slug: "the-first-crest",
    name: "The First Crest",
    species: "Eoredlichia intermedia",
    series: "Cambrian Dawn",
    meta: "Early Cambrian · 520 Ma",
    origin: "Yunnan, China",
    filters: ["Cambrian", "Sacred Geometry", "Extinct Icons"],
    images: {
      tee: "/fashion/tee-eoredlichia.webp",
      model: "/fashion/model-eoredlichia.webp",
      fossil: "/fashion/fossil-eoredlichia.webp",
      detail: "/fashion/detail-eoredlichia.webp",
    },
    gallery: [
      { src: "/fashion/tee-eoredlichia.webp", label: "T-Shirt Flat" },
      { src: "/fashion/model-eoredlichia.webp", label: "On Model" },
      { src: "/fashion/fossil-eoredlichia.webp", label: "Fossil Specimen" },
      { src: "/fashion/detail-eoredlichia.webp", label: "Print Detail" },
    ],
    specimen:
      "Eoredlichia intermedia — a 520-million-year-old Cambrian trilobite from Yunnan, China. Its near-perfect semicircular cephalon and fifteen articulated thoracic segments represent evolution's earliest experiment in radial symmetry. A blueprint for sacred geometry and ancient design predating human creativity by half a billion years.",
    philosophy:
      "Part of the Cambrian Dawn collection. The palette samples mineral colors from the fossil matrix: oxidized manganese purple, pyrite gold, and deep-sea black. Positioned as a heraldic crest from an empire that ruled the ocean floor before vertebrates existed. Evolution is the greatest designer. Nature was the first atelier.",
    collection: {
      headline: "Drop 01 · Cambrian Dawn",
      specs: [
        { label: "Material", value: "Premium heavyweight cotton" },
        { label: "Fit", value: "Oversized, dropped shoulder" },
        { label: "Origin", value: "Designed by Deep Time Studio" },
      ],
    },
  },
];

export function getFashionBySlug(slug: string): FashionProduct | undefined {
  return fashionProducts.find((p) => p.slug === slug);
}
