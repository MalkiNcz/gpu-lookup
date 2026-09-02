import * as cheerio from "cheerio";

const LISTING_URL = "https://graficke-karty.heureka.cz/f:2642:82902041/";
const MAX_PAGES = 5;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type ScrapedProduct = {
  id: string;
  name: string;
  price: number;
  url: string;
  image: string | null;
};

function parsePrice(rawText: string): number | null {
  // The first number in the text is always the lowest price, whether the
  // source shows "od X Kč", a "X – Y Kč" range, or a single "X Kč" value.
  // \s in JS regex already covers the non-breaking spaces Heureka uses as
  // thousands separators.
  const match = rawText.match(/\d[\d\s]*\d|\d/);
  if (!match) return null;
  const digits = match[0].replace(/\s/g, "");
  const price = Number.parseInt(digits, 10);
  return Number.isFinite(price) ? price : null;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseListingPage(html: string): ScrapedProduct[] {
  const $ = cheerio.load(html);
  const items: ScrapedProduct[] = [];

  $('li[data-testid="product-list-item"]').each((_, el) => {
    const $item = $(el);
    const link = $item.find('a[data-testid="product-title-link"]').first();
    const name = link.text().trim();
    const href = link.attr("href");
    const priceText = $item.find('[data-testid="product-price"]').first().text();
    const price = parsePrice(priceText);
    const image = $item.find('a[data-testid="product-image-link"] img').first().attr("src") ?? null;

    if (!name || !href || price === null) return;

    items.push({ id: slugify(name), name, price, url: href, image });
  });

  return items;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Heureka sits behind Cloudflare bot protection, which can occasionally
// answer a legitimate request with a transient 403. One short-delayed retry
// clears most of those without risking the scheduled function's 30s budget.
async function fetchPage(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "cs-CZ,cs;q=0.9",
      },
    });

    if (res.ok) return res.text();
    if (attempt < 2) await sleep(1500);
  }

  return null;
}

export async function scrapeAllPrices(): Promise<ScrapedProduct[]> {
  const found = new Map<string, ScrapedProduct>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? LISTING_URL : `${LISTING_URL}?f=${page}`;
    const html = await fetchPage(pageUrl);
    if (html === null) break;

    const pageItems = parseListingPage(html);
    if (pageItems.length === 0) break;

    for (const item of pageItems) found.set(item.id, item);
  }

  return [...found.values()];
}
