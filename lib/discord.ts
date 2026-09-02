export type PriceDrop = {
  name: string;
  oldPrice: number;
  newPrice: number;
  url: string;
};

function formatCzk(price: number): string {
  return `${price.toLocaleString("cs-CZ")} Kč`;
}

export async function notifyDiscord(webhookUrl: string, drops: PriceDrop[]): Promise<void> {
  if (drops.length === 0) return;

  // Discord embeds allow at most 25 fields; further drops would need a follow-up message.
  const fields = drops.slice(0, 25).map((drop) => ({
    name: drop.name,
    value: `~~${formatCzk(drop.oldPrice)}~~ → **${formatCzk(drop.newPrice)}**\n[Zobrazit nabídku](${drop.url})`,
  }));

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "📉 Pokles ceny – AMD RX 9070 XT",
          color: 0xe74c3c,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook selhal: ${res.status} ${await res.text()}`);
  }
}
