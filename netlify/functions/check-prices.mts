import type { Config } from "@netlify/functions";
import { runPriceCheck } from "../../lib/checkPrices";

async function checkPricesHandler() {
  try {
    const result = await runPriceCheck();
    console.log(
      `Kontrola cen dokončena: checked=${result.checked} drops=${result.drops} new=${result.newProducts}`,
    );
  } catch (error) {
    console.error("Kontrola cen selhala:", error);
  }
}

export default checkPricesHandler;

// Once a day at 13:00 UTC — 14:00/15:00 in Czech time depending on DST, i.e.
// afternoon. Cron times are always UTC on Netlify.
export const config: Config = {
  schedule: "0 13 * * *",
};
