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

// Twice a day, 08:00 and 20:00 UTC. Cron times are always UTC on Netlify.
export const config: Config = {
  schedule: "0 8,20 * * *",
};
