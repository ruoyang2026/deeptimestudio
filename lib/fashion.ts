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
  story: string[];
  philosophy: string[];
  collection: {
    headline: string;
    blurb: string;
    blurb2: string;
    specs: { label: string; value: string }[];
  };
};

export const fashionProducts: FashionProduct[] = [
  {
    slug: "the-first-crest",
    name: "The First Crest",
    species: "Eoredlichia intermedia",
    series: "Cambrian Dawn",
    meta: "520 Million Years Old · Early Cambrian · Yunnan, China",
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
    story: [
      "Before dinosaurs. Before flowers. Before almost everything we recognize today, this creature was already here.",
      "Eoredlichia intermedia lived more than 520 million years ago in what is now Yunnan, China.",
      "We didn't invent the creature.",
      "Nature already designed it.",
      "We simply brought the original back.",
    ],
    philosophy: [
      "Five hundred million years ago, nature was already making incredible designs.",
      "The colors come from the fossil itself — mineral purple, pyrite gold and deep black.",
      "We kept the original shape almost untouched.",
      "No fantasy creature. No invented pattern. Just evolution's original design.",
      "Nature was the first designer.",
    ],
    collection: {
      headline: "Drop 01 · Cambrian Dawn",
      blurb: "A fossil-inspired graphic tee built around a real prehistoric specimen.",
      blurb2: "Designed for people who like ancient things, unusual graphics and clothes with a story.",
      specs: [
        { label: "Material", value: "Premium heavyweight cotton" },
        { label: "Fit", value: "Oversized, dropped shoulder" },
        { label: "Design", value: "Deep Time Studio" },
      ],
    },
  },
];

export function getFashionBySlug(slug: string): FashionProduct | undefined {
  return fashionProducts.find((p) => p.slug === slug);
}
