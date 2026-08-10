export const FASHION_FILTERS = [
  "All",
  "Cambrian",
  "Ordovician",
  "Sacred Geometry",
  "Extinct Icons",
  "Limited Drop",
];

export type FashionProduct = {
  slug: string;
  name: string;
  series: string;
  species: string;
  meta: string;
  blurb: string;
  palette: string;
  tags: string[];
  filters: string[];
  images: {
    tee: string;
    model: string;
    fossil: string;
    concept: string;
  };
  carouselCaption: string;
  specimen: {
    headline: string;
    paragraphs: string[];
    features: { label: string; value: string }[];
  };
  philosophy: {
    headline: string;
    paragraphs: string[];
    whyTitle: string;
    whyBody: string;
    messageTitle: string;
    messageParagraphs: string[];
    argumentTitle: string;
    argumentItems: string[];
  };
  concept: {
    headline: string;
    paragraphs: string[];
    closingLines: string[];
  };
  color: {
    headline: string;
    paragraphs: string[];
    closing: string;
    specs: { label: string; value: string }[];
  };
  typography: {
    headline: string;
    paragraphs: string[];
    closing: string;
  };
  collection: {
    headline: string;
    paragraph: string;
    limited: string;
    specs: { label: string; value: string }[];
  };
};

export const fashionProducts: FashionProduct[] = [
  {
    slug: "eoredlichia-cambrian-crest",
    name: "The First Crest",
    series: "Cambrian Dawn",
    species: "Eoredlichia intermedia",
    meta: "Early Cambrian · 520 Ma",
    blurb: "A talisman from the dawn of complex life.",
    palette: "Metallic purple and fossil gold on black.",
    tags: ["Redlichiida", "Sacred Geometry", "Cambrian"],
    filters: ["Cambrian", "Sacred Geometry", "Extinct Icons"],
    images: {
      tee: "/fashion/tee-eoredlichia.webp",
      model: "/fashion/model-eoredlichia.webp",
      fossil: "/fashion/fossil-eoredlichia.webp",
      concept: "/fashion/concept-eoredlichia.webp",
    },
    carouselCaption: "From fossil archive to wearable icon.",
    specimen: {
      headline: "520 MILLION YEARS AGO, THIS CREATURE PERFECTED SYMMETRY.",
      paragraphs: [
        "The Eoredlichia carries one of evolution's earliest experiments in radial balance.",
        "Its cephalon — the head shield — forms a near-perfect semicircle, divided by three glabellar furrows that read like geological contour lines. Fifteen thoracic segments articulate with mechanical precision; the ninth bears a defensive axial spine, nature's first structural protrusion.",
        "To wear this form is to wear the blueprint of all later design: segmentation, repetition, defensive ornament, and the golden ratio pressed into chitin before humans existed.",
      ],
      features: [
        { label: "Form", value: "Elongate-oval dorsal shield, subsemicircular cephalon" },
        { label: "Symmetry", value: "Bilateral, with crescentic palpebral lobes" },
        { label: "Defense", value: "Slender genal spines + stout axial spine on 9th segment" },
        { label: "Origin", value: "Yunnan, China · Early Cambrian Series 2, Stage 3" },
      ],
    },
    philosophy: {
      headline: "COLLABORATION WITH EXTINCTION",
      paragraphs: [
        "We did not design this creature.",
        "We excavated its aesthetic from the fossil record.",
      ],
      whyTitle: "WHY EOREDLICHIA?",
      whyBody:
        "Eoredlichia belongs to the Redlichiida — the first great dynasty of trilobites. It is literally named \"the dawn of Redlichia\" (eo-, Greek for dawn). In fashion terms: this is not a revival trend. This is the original.",
      messageTitle: "THE MESSAGE",
      messageParagraphs: [
        "\"OLDER THAN EVERYTHING. NEVER GO OUT OF STYLE.\"",
        "This is not a slogan about vintage clothing. It is a statement about deep time.",
        "Trilobites survived for 270 million years. They outlasted mountains, oceans, and continents. Fashion cycles last six months. The Eoredlichia asks: what if permanence were the ultimate luxury?",
      ],
      argumentTitle: "TO WEAR IT IS TO ARGUE THAT:",
      argumentItems: [
        "Nature conducted the first R&D.",
        "Extinction is not failure, but curation.",
        "And evolution remains the greatest designer to ever work this planet.",
      ],
    },
    concept: {
      headline: "SACRED GEOMETRY FROM THE BOTTOM OF TIME",
      paragraphs: [
        "The Eoredlichia is not a bug. It is a mandala.",
        "Look at the glabella — that conical central ridge. It is echoed in Gothic cathedral vaults, in Art Deco sunbursts, in the composition of every luxury brand monogram. The three pairs of furrows create a rhythm: shallow, deep, deeper. This is visual hierarchy invented by geology.",
        "We placed the specimen at the center of the tee like a heraldic crest because that is what it is: the coat of arms of an empire that ruled the ocean floor before vertebrates existed.",
      ],
      closingLines: [
        "THIS IS DARK ACADEMIA WITH A GEOLOGICAL FOUNDATION.",
        "THIS IS STREETWEAR WITH A PHD.",
      ],
    },
    color: {
      headline: "THE PALETTE OF MINERALIZATION",
      paragraphs: [
        "The purple you see is not arbitrary. It is the color of oxidized manganese in Cambrian shale — the chemical signature of the rock that preserved this fossil.",
        "The gold is not metallic ink. It is the visual equivalent of pyrite replacement, where iron sulfide slowly replaces organic tissue, turning bone into gemstone over millennia.",
        "The black ground is the absence of light at the bottom of an ancient ocean.",
      ],
      closing: "WE DID NOT CHOOSE THESE COLORS. WE SAMPLED THEM FROM THE FOSSIL ITSELF.",
      specs: [
        { label: "Base", value: "100% cotton, garment-dyed black" },
        { label: "Graphic", value: "Discharge print + metallic gold overlay" },
        { label: "Texture", value: "Weathered stone finish on typography" },
      ],
    },
    typography: {
      headline: "CARVED, NOT PRINTED",
      paragraphs: [
        "The typeface for \"OLDER THAN EVERYTHING\" is treated as if it were chiseled into limestone. The serifs are not refined; they are eroded. The letterforms carry pitting and grain — not as a distress effect, but as a geological truth.",
        "The species name, Eoredlichia, is set in italic serif to honor the Linnaean tradition, but positioned like a museum label: small, precise, authoritative.",
        "The horizontal rules above and below the main text mimic the stratigraphic lines of a geological cross-section.",
      ],
      closing: "EVERY ELEMENT IS EITHER FOSSIL OR MATRIX.",
    },
    collection: {
      headline: "CAMBRIAN DAWN — DROP 01",
      paragraph:
        "This piece is part of the inaugural Cambrian Dawn series, featuring organisms from the first chapter of complex animal life. Future drops will explore the Ordovician radiation, the Silurian reef builders, and the Devonian extinction events.",
      limited:
        "Each design is limited to the digital archive from which it came. When the fossil is unique, the design is unique.",
      specs: [
        { label: "Material", value: "Premium heavyweight cotton" },
        { label: "Fit", value: "Oversized, dropped shoulder" },
        { label: "Origin", value: "Designed by Deep Time Studio · Fossil specimen from Yunnan, China" },
      ],
    },
  },
];

export function getFashionBySlug(slug: string): FashionProduct | undefined {
  return fashionProducts.find((p) => p.slug === slug);
}
