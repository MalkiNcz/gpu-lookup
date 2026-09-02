import { readPrices, type PriceRecord } from "@/lib/priceStore";

export const dynamic = "force-dynamic";

function formatCzk(price: number): string {
  return `${price.toLocaleString("cs-CZ")} Kč`;
}

function formatDate(iso: string): string {
  if (!iso) return "zatím žádná kontrola";
  return new Date(iso).toLocaleString("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
}

export default async function Home() {
  let lastRun = "";
  let items: [string, PriceRecord][] = [];
  let loadError: string | null = null;

  try {
    const data = await readPrices();
    lastRun = data.lastRun;
    items = Object.entries(data.items).sort((a, b) => a[1].price - b[1].price);
  } catch {
    loadError =
      "Netlify Blobs nejsou dostupné (v lokálním vývoji spusť `netlify dev` místo `next dev`).";
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            AMD RX 9070 XT – hlídač cen
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ceny se stahují z Heureka.cz 2× denně. Poslední kontrola: {formatDate(lastRun)}
          </p>
        </div>

        {loadError && (
          <p className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {loadError}
          </p>
        )}

        {!loadError && items.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Zatím nejsou uložená žádná data – počkej na první běh kontroly nebo ji spusť ručně
            přes <code>/api/check-prices</code>.
          </p>
        )}

        {items.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4 font-medium">Model</th>
                <th className="py-2 font-medium">Nejnižší cena</th>
              </tr>
            </thead>
            <tbody>
              {items.map(([id, item]) => (
                <tr
                  key={id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 text-black dark:text-zinc-50">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {item.name}
                    </a>
                  </td>
                  <td className="py-2 whitespace-nowrap text-black dark:text-zinc-50">
                    {formatCzk(item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
