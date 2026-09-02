import { scrapeAllPrices } from "./heureka";
import { readPrices, writePrices, type PriceData } from "./priceStore";
import { notifyDiscord, type PriceDrop } from "./discord";

export type CheckResult = {
  checked: number;
  drops: number;
  newProducts: number;
};

const MANUAL_REFRESH_COOLDOWN_MS = 3 * 60 * 60 * 1000;

export async function runPriceCheck(options: { manual?: boolean } = {}): Promise<CheckResult> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Chybí proměnná prostředí DISCORD_WEBHOOK_URL");
  }

  const [scraped, stored] = await Promise.all([scrapeAllPrices(), readPrices()]);

  if (scraped.length === 0) {
    throw new Error("Ze stránky Heureka se nepodařilo načíst žádný produkt – zkontroluj, zda se nezměnila struktura stránky");
  }

  const drops: PriceDrop[] = [];
  let newProducts = 0;
  const nextItems: PriceData["items"] = { ...stored.items };

  for (const product of scraped) {
    const previous = stored.items[product.id];

    if (!previous) {
      newProducts++;
    } else if (product.price < previous.price) {
      drops.push({
        name: product.name,
        oldPrice: previous.price,
        newPrice: product.price,
        url: product.url,
      });
    }

    nextItems[product.id] = {
      name: product.name,
      price: product.price,
      url: product.url,
      image: product.image,
    };
  }

  await notifyDiscord(webhookUrl, drops);

  const now = new Date().toISOString();
  await writePrices({
    lastRun: now,
    lastManualRefresh: options.manual ? now : stored.lastManualRefresh,
    items: nextItems,
  });

  return { checked: scraped.length, drops: drops.length, newProducts };
}

export type ManualRefreshResult =
  | { ok: true; result: CheckResult }
  | { ok: false; retryAfterMs: number };

// Global cooldown (shared across everyone behind the login), so the button
// can't be used to hammer Heureka or spam the Discord webhook.
export async function requestManualRefresh(): Promise<ManualRefreshResult> {
  const stored = await readPrices();
  const lastMs = stored.lastManualRefresh ? new Date(stored.lastManualRefresh).getTime() : 0;
  const elapsed = Date.now() - lastMs;

  if (elapsed < MANUAL_REFRESH_COOLDOWN_MS) {
    return { ok: false, retryAfterMs: MANUAL_REFRESH_COOLDOWN_MS - elapsed };
  }

  const result = await runPriceCheck({ manual: true });
  return { ok: true, result };
}
