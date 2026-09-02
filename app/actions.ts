"use server";

import { requestManualRefresh } from "@/lib/checkPrices";

export type RefreshActionResult =
  | { ok: true; checked: number; drops: number }
  | { ok: false; message: string };

function formatWait(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export async function refreshPricesAction(): Promise<RefreshActionResult> {
  try {
    const outcome = await requestManualRefresh();

    if (!outcome.ok) {
      return {
        ok: false,
        message: `Obnovení je omezené na jednou za 3 hodiny. Zkus to znovu za ${formatWait(outcome.retryAfterMs)}.`,
      };
    }

    return { ok: true, checked: outcome.result.checked, drops: outcome.result.drops };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Obnovení se nezdařilo." };
  }
}
