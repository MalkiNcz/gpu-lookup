import { NextResponse } from "next/server";
import { runPriceCheck } from "@/lib/checkPrices";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requiredSecret = process.env.CRON_SECRET;
  if (requiredSecret) {
    const providedSecret = new URL(request.url).searchParams.get("secret");
    if (providedSecret !== requiredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runPriceCheck();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
