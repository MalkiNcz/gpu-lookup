import { scrapeAllPrices } from "./heureka";
import { readPrices, writePrices, type PriceData } from "./priceStore";
import { notifyDiscord, type PriceDrop } from "./discord";

export type CheckResult = {
  checked: number;
  drops: number;
  newProducts: number;
};

export async function runPriceCheck(): Promise<CheckResult> {
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

    nextItems[product.id] = { name: product.name, price: product.price, url: product.url };
  }

  await notifyDiscord(webhookUrl, drops);
  await writePrices({ lastRun: new Date().toISOString(), items: nextItems });

  return { checked: scraped.length, drops: drops.length, newProducts };
}
