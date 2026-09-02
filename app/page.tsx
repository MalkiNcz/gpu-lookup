import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readPrices, type PriceRecord } from "@/lib/priceStore";
import { SESSION_COOKIE_NAME, isAuthConfigured } from "@/lib/auth";
import { refreshPricesAction } from "./actions";
import { PriceGrid } from "./PriceGrid";
import { RefreshButton } from "./RefreshButton";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  if (!iso) return "zatím žádná kontrola";
  return new Date(iso).toLocaleString("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
}

async function logout() {
  "use server";
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export default async function Home() {
  let lastRun = "";
  let lastManualRefresh = "";
  let items: [string, PriceRecord][] = [];
  let loadError: string | null = null;

  try {
    const data = await readPrices();
    lastRun = data.lastRun;
    lastManualRefresh = data.lastManualRefresh;
    items = Object.entries(data.items).sort((a, b) => a[1].price - b[1].price);
  } catch {
    loadError =
      "Netlify Blobs nejsou dostupné (v lokálním vývoji spusť `netlify dev` místo `next dev`).";
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              AMD RX 9070 XT – hlídač cen
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Ceny se stahují z Heureka.cz 1× denně odpoledne. Poslední kontrola: {formatDate(lastRun)}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-3">
            {!loadError && (
              <RefreshButton action={refreshPricesAction} lastManualRefresh={lastManualRefresh} />
            )}

            {isAuthConfigured() && (
              <form action={logout}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-900 dark:hover:text-red-400"
                >
                  Odhlásit
                </button>
              </form>
            )}
          </div>
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

        {items.length > 0 && <PriceGrid items={items} />}
      </main>
    </div>
  );
}
