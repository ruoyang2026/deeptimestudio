import fashionDb from "../data/fashion.json";

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

type FashionDb = {
  filters: string[];
  products: FashionProduct[];
};

const db = fashionDb as unknown as FashionDb;

export const FASHION_FILTERS = db.filters;
export const fashionProducts: FashionProduct[] = db.products;

export function getFashionBySlug(slug: string): FashionProduct | undefined {
  return fashionProducts.find((p) => p.slug === slug);
}
