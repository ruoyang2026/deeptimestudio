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
    slug: "eoredlichia-cambrian-crest",
    name: "The First Crest",
    species: "Eoredlichia intermedia",
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
      "Eoredlichia intermedia, a 520-million-year-old Cambrian trilobite from Yunnan, China. Its near-perfect semicircular cephalon and fifteen articulated thoracic segments represent evolution's earliest experiment in radial symmetry — a blueprint for sacred geometry predating human design by half a billion years.",
    philosophy:
      "Part of the Cambrian Dawn series. The palette samples mineral colors from the fossil matrix itself: oxidized manganese purple, pyrite gold, and deep-sea black. The specimen is positioned as a heraldic crest from an empire that ruled the ocean floor before vertebrates existed. Evolution is the greatest designer.",
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
