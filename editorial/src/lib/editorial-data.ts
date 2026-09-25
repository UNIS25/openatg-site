export type EditorialMedia = {
  path: string;
  alt: Record<string, string>;
  approved: boolean;
};
export type EditorialData = {
  asOf: number;
  media: Record<string, EditorialMedia>;
  slides: { id: string; kind: string; mediaKey: string }[];
  offers: {
    id: string;
    productId: string;
    originalPriceCents: number;
    promotionalPriceCents: number;
    startsAt: string;
    endsAt: string;
  }[];
  mostChosenIds: string[];
  editorIds: string[];
  backInStockIds: string[];
};
