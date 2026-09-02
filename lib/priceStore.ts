import { getStore } from "@netlify/blobs";

export type PriceRecord = {
  name: string;
  price: number;
  url: string;
};

export type PriceData = {
  lastRun: string;
  items: Record<string, PriceRecord>;
};

const STORE_NAME = "gpu-prices";
const KEY = "rx-9070-xt.json";

const EMPTY_DATA: PriceData = { lastRun: "", items: {} };

function store() {
  return getStore(STORE_NAME);
}

export async function readPrices(): Promise<PriceData> {
  const data = await store().get(KEY, { type: "json" });
  return (data as PriceData | null) ?? EMPTY_DATA;
}

export async function writePrices(data: PriceData): Promise<void> {
  await store().setJSON(KEY, data);
}
