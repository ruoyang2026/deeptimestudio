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
  specimen: {
    image: string;
    paragraphs: string[];
  };
  story: string[];
  philosophy: string[];
  collection: {
    headline: string;
  };
};

export const fashionProducts: FashionProduct[] = [
  {
    slug: "the-first-crest",
    name: "The First Crest",
    species: "Eoredlichia intermedia",
    series: "Cambrian Dawn",
    meta: "520 Million Years Old · Early Cambrian · Kunming, Yunnan",
    origin: "Kunming, Yunnan",
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
    specimen: {
      image: "/fashion/fossil-eoredlichia.webp",
      paragraphs: [
        "This specimen of Eoredlichia intermedia was recovered from the Early Cambrian strata near Kunming, Yunnan — a region that preserves one of the most complete records of the Cambrian Explosion. The fossil retains the species' characteristic semicircular cephalon and fifteen thoracic segments, mineralized in dark shale for over half a billion years.",
      ],
    },
    story: [
      "Before dinosaurs. Before flowers. Before almost everything we recognize as \"life today.\"",
      "520 million years ago, in the warm shallow seas of what is now Kunming, this creature was already armored, segmented, and symmetrical. It did not know it would become a fossil. It did not know it would outlast the mountains that buried it.",
      "We found it in the rock. We photographed it. We did not improve it.",
    ],
    philosophy: [
      "The palette is sampled directly from the fossil matrix: oxidized manganese purple, pyrite replacement gold, and the deep black of Cambrian shale.",
      "The form is not reinterpreted — it is repositioned. The Eoredlichia is treated as a heraldic crest from an empire that ruled the ocean floor before vertebrates existed.",
      "Real fossil. Reimagined.",
    ],
    collection: {
      headline: "Drop 01 · Cambrian Dawn",
    },
  },
];

export function getFashionBySlug(slug: string): FashionProduct | undefined {
  return fashionProducts.find((p) => p.slug === slug);
}
