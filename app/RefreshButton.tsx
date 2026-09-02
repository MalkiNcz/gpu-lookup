"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RefreshActionResult } from "./actions";

const COOLDOWN_MS = 3 * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export function RefreshButton({
  action,
  lastManualRefresh,
}: {
  action: () => Promise<RefreshActionResult>;
  lastManualRefresh: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Keep the countdown live without a full page reload.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const lastMs = lastManualRefresh ? new Date(lastManualRefresh).getTime() : 0;
  const remaining = COOLDOWN_MS - (now - lastMs);
  const onCooldown = remaining > 0;

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage(
          `Hotovo — zkontrolováno ${result.checked} modelů${result.drops > 0 ? `, ${result.drops}× pokles ceny` : ""}.`,
        );
        router.refresh();
      } else {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || onCooldown}
        className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-zinc-300 disabled:hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-900 dark:hover:text-red-400 dark:disabled:hover:border-zinc-700 dark:disabled:hover:text-zinc-400"
      >
        {isPending ? "Obnovuji…" : onCooldown ? `Obnovit (za ${formatRemaining(remaining)})` : "Obnovit ceny"}
      </button>
      {message && <p className="max-w-56 text-right text-xs text-zinc-500 dark:text-zinc-500">{message}</p>}
    </div>
  );
}
