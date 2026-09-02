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
- **`app/page.tsx`** – stránka s panely aktuálních nejnižších cen, obrázkem
  modelu a vyhledáváním (klik na panel vede na nabídku), plus tlačítko
  "Obnovit ceny" pro ruční kontrolu.
- **`app/actions.ts`** – Server Action `refreshPricesAction`, kterou volá
  tlačítko "Obnovit ceny"; ruční obnovení je omezené na jednou za 3 hodiny
  (sdíleně, ne per-uživatel – ochrana proti zbytečnému zatěžování Heureky/
  Discordu, i kdyby login znal víc lidí).
- **`proxy.ts`** – zahesluje celý web (mimo `/login` a `/api`) vlastní
  přihlašovací stránkou, pokud jsou nastavené `SITE_USERNAME`/`SITE_PASSWORD`
  (jinak je web bez omezení). Přihlášení nastaví podepsanou cookie platnou
  30 dní; `lib/auth.ts` má logiku pro podpis/ověření a porovnání hesla.
- **`app/login/`** – vlastní login formulář (`LoginForm.tsx` je klientská
  komponenta s `useActionState` pro chybovou hlášku a stav odesílání,
  `page.tsx` obsahuje Server Action, který ověří heslo a nastaví cookie).

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
| `SITE_USERNAME` / `SITE_PASSWORD` | Ne | Pokud jsou obě nastavené, web (mimo `/login` a `/api/check-prices`, který má vlastní `CRON_SECRET`) vyžaduje přihlášení přes `/login` – vlastní formulář, ne prohlížečové okno. Bez nich je web veřejně přístupný. **Doporučeno nastavit na produkci**, jinak je stránka s cenami veřejná pro kohokoliv. |

Lokálně je můžeš dát do `.env` (Next.js) / `.env` pro Netlify CLI. Na Netlify
je nastav v **Site configuration → Environment variables** – `SITE_USERNAME`
a `SITE_PASSWORD` tam nastav zvlášť pečlivě, ať na produkci web nezůstane
nezaheslovaný. Přihlašovací cookie je podepsaná hodnotou `SITE_PASSWORD`, takže
změna hesla automaticky odhlásí všechny existující session.

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

`/api/check-prices` není chráněné přihlašovací stránkou (jen `CRON_SECRET`),
takže výše uvedený curl funguje i se zapnutým `SITE_USERNAME`/`SITE_PASSWORD`.
Pro prohlížení webu (`/`) se přihlas přes `http://localhost:8888/login`.

Bez `netlify dev` (jen `npm run dev`) appka běží, ale endpoint i domovská
stránka nahlásí, že Blobs nejsou dostupné. `netlify dev` navíc načítá `.env`
jen při startu – po úpravě proměnných je potřeba ho restartovat.

## Nasazení na Netlify

1. Push repozitáře na GitHub/GitLab a v Netlify vytvoř nový site z tohoto
   repozitáře (Netlify automaticky rozpozná Next.js).
2. V **Site configuration → Environment variables** nastav
   `DISCORD_WEBHOOK_URL` a doporučeně i `SITE_USERNAME`/`SITE_PASSWORD`
   (a volitelně `CRON_SECRET`).
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
