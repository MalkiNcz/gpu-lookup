"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PriceRecord } from "@/lib/priceStore";

type Item = [string, PriceRecord];

function formatCzk(price: number): string {
  return `${price.toLocaleString("cs-CZ")} Kč`;
}

export function PriceGrid({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(([, item]) => item.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="flex flex-col gap-6">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Hledat model… (např. Sapphire, ASRock, Gigabyte)"
        className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />

      {filtered.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Žádný model neodpovídá hledání &bdquo;{query}&ldquo;.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(([id, item], index) => (
          <Card key={id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

function Card({ item, index }: { item: PriceRecord; index: number }) {
  const [imageBroken, setImageBroken] = useState(false);
  const showImage = Boolean(item.image) && !imageBroken;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${index * 25}ms` }}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white opacity-0 animate-[card-in_0.4s_ease-out_forwards] transition-all duration-200 hover:-translate-y-1 hover:border-red-300 hover:shadow-lg hover:shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-red-900 dark:hover:shadow-black/40"
    >
      <div className="relative h-40 w-full shrink-0 bg-zinc-100 dark:bg-zinc-900">
        {showImage ? (
          <Image
            src={item.image as string}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4 transition-transform duration-200 group-hover:scale-105"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-600">
            Bez náhledu
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <span className="text-sm font-medium text-black transition-colors group-hover:text-red-600 dark:text-zinc-50 dark:group-hover:text-red-400">
          {item.name}
        </span>
        <span className="mt-4 text-lg font-semibold text-black dark:text-zinc-50">
          {formatCzk(item.price)}
        </span>
      </div>
    </a>
  );
}
