# RX 9070 XT – hlídač cen

Sleduje ceny všech dostupných modelů grafické karty **AMD RX 9070 XT** na
[Heureka.cz](https://graficke-karty.heureka.cz/f:2642:82902041/) a 2× denně
kontroluje, jestli u některého modelu neklesla cena pod naposledy zaznamenanou
hodnotu. Pokud ano, pošle upozornění na Discord webhook. Poslední známé ceny
jsou vidět i na hlavní stránce webu.

## Jak to funguje

- **`lib/heureka.ts`** – stáhne a rozparsuje výpis modelů RX 9070 XT z
  Heureky (název, cena, odkaz na nabídku).
- **`lib/priceStore.ts`** – uloží/načte poslední známé ceny přes
  [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).
- **`lib/discord.ts`** – pošle zprávu do Discordu přes webhook, pokud u
  nějakého modelu cena klesla.
- **`lib/checkPrices.ts`** – spojí předchozí kroky dohromady (scrape →
  porovnání s uloženými cenami → notifikace → uložení nových cen).
- **`netlify/functions/check-prices.mts`** – [Netlify Scheduled Function](https://docs.netlify.com/build/functions/scheduled-functions/),
  která kontrolu spouští automaticky 2× denně (výchozí čas 8:00 a 20:00 UTC).
- **`app/api/check-prices/route.ts`** – stejná kontrola dostupná i ručně přes
  HTTP (pro testování nebo manuální trigger).
- **`app/page.tsx`** – jednoduchá stránka s tabulkou aktuálních nejnižších
  cen a časem poslední kontroly.

Kontrola vždy porovnává novou cenu s cenou z **předchozí** kontroly (ne s
historickým minimem) – po každém běhu se uložená cena přepíše na aktuální,
ať šla nahoru nebo dolů.

## Nastavení

### 1. Závislosti

```bash
npm install
```

### 2. Discord webhook

1. V Discordu: Nastavení serveru → Integrace → Webhooky → Nový webhook.
2. Zkopíruj jeho URL.

### 3. Proměnné prostředí

| Proměnná | Povinná | Popis |
| --- | --- | --- |
| `DISCORD_WEBHOOK_URL` | Ano | URL Discord webhooku pro odesílání upozornění na pokles ceny. |
| `CRON_SECRET` | Ne | Pokud nastaveno, `/api/check-prices` vyžaduje `?secret=...` v URL – doporučeno, protože jinak je endpoint veřejně spustitelný kýmkoliv. |

Lokálně je můžeš dát do `.env` (Next.js) / `.env` pro Netlify CLI. Na Netlify
je nastav v **Site configuration → Environment variables**.

### 4. Netlify Blobs

Netlify Blobs nevyžadují žádné ruční založení databáze – store se vytvoří
automaticky při prvním zápisu. Na produkci (nasazeno přes Netlify) funguje
bez dalšího nastavení. Pro lokální vývoj se stejným store použij `netlify
dev` (viz níže) – čisté `next dev` nemá k Blobs přístup a stránka i endpoint
to zvládnou zobrazit jako chybu bez pádu appky.

## Lokální vývoj

```bash
npm install -g netlify-cli   # pokud ještě nemáš
netlify link                 # propojení s existujícím Netlify site
netlify dev
```

`netlify dev` spustí Next.js dev server a zároveň zpřístupní Netlify Blobs i
scheduled function lokálně. Kontrolu cen pak můžeš vyvolat ručně:

```bash
curl "http://localhost:8888/api/check-prices?secret=TVUJ_CRON_SECRET"
```

Bez `netlify dev` (jen `npm run dev`) appka běží, ale endpoint i domovská
stránka nahlásí, že Blobs nejsou dostupné.

## Nasazení na Netlify

1. Push repozitáře na GitHub/GitLab a v Netlify vytvoř nový site z tohoto
   repozitáře (Netlify automaticky rozpozná Next.js).
2. V **Site configuration → Environment variables** nastav
   `DISCORD_WEBHOOK_URL` (a volitelně `CRON_SECRET`).
3. Nasaď. Scheduled function `check-prices` se aktivuje automaticky podle
   `netlify/functions/check-prices.mts` – žádná další konfigurace není
   potřeba.
4. Frekvenci/čas kontroly změníš úpravou `schedule` v
   `netlify/functions/check-prices.mts` (cron je vždy v UTC).

## Poznámka ke spolehlivosti scrapování

Heureka.cz je za Cloudflare ochranou proti botům, která může výjimečně
vrátit dočasnou chybu 403 i na legitimní požadavek. Scraper to řeší jedním
opakováním s prodlevou; pokud selže i tak, kontrola se bez zápisu ukončí a
nic se nepřepíše ani neodešle – další běh (za cca 12 hodin) proběhne
normálně. Pravidelný provoz 2× denně je vůči tomuto typu ochrany výrazně
šetrnější než časté/rychlé dotazy.

## Přehled produktů

Cílová stránka je [Heureka.cz – Grafické karty AMD Radeon RX 9070
XT](https://graficke-karty.heureka.cz/f:2642:82902041/), tedy srovnání napříč
obchody – pro každý model se bere jeho aktuálně nejnižší nabízená cena.
