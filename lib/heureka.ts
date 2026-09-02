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

type FetchResult = { html: string } | { failure: string };

// Heureka sits behind Cloudflare bot protection, which can occasionally
// answer a legitimate request with a transient 403. One short-delayed retry
// clears most of those without risking the scheduled function's 30s budget.
async function fetchPage(url: string): Promise<FetchResult> {
  let failure = "neznámá chyba";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "cs-CZ,cs;q=0.9",
        },
      });

      if (res.ok) return { html: await res.text() };
      failure = `HTTP ${res.status} ${res.statusText}`;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }

    if (attempt < 2) await sleep(1500);
  }

  return { failure };
}

export async function scrapeAllPrices(): Promise<ScrapedProduct[]> {
  const found = new Map<string, ScrapedProduct>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? LISTING_URL : `${LISTING_URL}?f=${page}`;
    const fetched = await fetchPage(pageUrl);

    if ("failure" in fetched) {
      // Page 1 failing to fetch at all is a distinct problem (blocked/
      // network) from later pages running out (normal end of pagination) or
      // page 1 parsing to zero items (Heureka's markup changed).
      if (page === 1) {
        throw new Error(`Nepodařilo se stáhnout stránku Heureka (${fetched.failure})`);
      }
      break;
    }

    const pageItems = parseListingPage(fetched.html);
    if (pageItems.length === 0) break;

    for (const item of pageItems) found.set(item.id, item);
  }

  return [...found.values()];
}
