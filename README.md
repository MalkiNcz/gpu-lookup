# RX 9070 XT – hlídač cen

Sleduje ceny všech dostupných modelů grafické karty **AMD RX 9070 XT** na
[Heureka.cz](https://graficke-karty.heureka.cz/f:2642:82902041/) a 1× denně
odpoledne kontroluje, jestli u některého modelu neklesla cena pod naposledy zaznamenanou
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
  která kontrolu spouští automaticky 1× denně (výchozí čas 13:00 UTC, tj.
  odpoledne v ČR).
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
| `SCRAPER_API_KEY` | Doporučeno na Netlify | API klíč pro [ScraperAPI](https://www.scraperapi.com/) – viz sekce [Scrapování z Netlify](#scrapování-z-netlify-scraperapi) níže. Bez něj appka stahuje Heureku napřímo, což z Netlify skoro jistě skončí HTTP 403. |
| `SCRAPER_API_PREMIUM` | Ne | Nastav na `true`, pokud i se `SCRAPER_API_KEY` dostáváš 403 – zapne dražší "premium" bypass režim ScraperAPI (víc kreditů za request, viz níže). |

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

## Scrapování z Netlify (ScraperAPI)

Heureka.cz je za Cloudflare ochranou proti botům. Ta má dvě úrovně:

- **Transientní blokace** – výjimečná, dočasná 403 i na legitimní požadavek.
  Tu řeší jedno opakování s prodlevou přímo v `lib/heureka.ts`.
- **Trvalá blokace podle IP reputace** – Netlify Functions běží ze sdílených
  cloudových (AWS) IP adres, které Cloudflare u agregátorů jako Heureka
  typicky blokuje napořád, ne jen občas. Lokálně (z běžného domácího
  připojení) appka funguje bez problémů, ale nasazená na Netlify dostane
  konzistentní `HTTP 403 Forbidden`.

Řešení: nastav `SCRAPER_API_KEY` a požadavky na Heureku půjdou přes
[ScraperAPI](https://www.scraperapi.com/), který je routuje přes
rezidentní/rotující IP adresy.

1. Založ si účet na scraperapi.com (7denní trial s 5 000 kredity, poté trvalý
   free plán 1 000 kreditů/měsíc) a zkopíruj API klíč.
2. Nastav `SCRAPER_API_KEY` v `.env` i na Netlify.
3. `SCRAPER_API_PREMIUM` nech vypnutý – ScraperAPI si Heureku sám vyhodnotí
   jako chráněnou doménu a i bez tohoto příznaku automaticky použije a
   naúčtuje bypass režim. Zapnutí `premium=true` by sáhlo na jejich dražší
   premium proxy pool navrch, ne na tohle – nepomůže to, jen to prodraží.

**Ověřená spotřeba kreditů** (z produkčního provozu): scraper stahuje 2
stránky za kontrolu (pagination se zastaví, jakmile na Heurece dojdou další
modely), každá stránka stojí 10 kreditů → **20 kreditů/kontrola**. Při 1×
denně automaticky je to jen **~600 kreditů/měsíc** – pohodlně v mezích
trvalého free plánu (1 000/měsíc), i s rezervou na občasné ruční "Obnovit
ceny" (max 8×/den kvůli 3hodinovému limitu, +20 kreditů za klik). `sa-credit-
cost` hlavička v odpovědi ScraperAPI ukazuje cenu konkrétního requestu,
pokud chceš spotřebu sledovat přesně.

Bez `SCRAPER_API_KEY` appka stahuje Heureku napřímo (funguje pro lokální
vývoj). Pokud scraping i tak selže, kontrola se bez zápisu ukončí – nic se
nepřepíše ani neodešle na Discord, další běh (za cca 12 hodin, nebo ruční
klik) proběhne normálně.

**Rychlost**: přes proxy trvá kontrola cca 10 s na stránku (ScraperAPI musí
požadavek sám routovat přes bypass), tedy ~10–20 s za celou kontrolu. Do
30sekundového limitu scheduled function se to vejde s rezervou, ale je to
znatelně pomalejší než přímý fetch (ten trvá pod 2 s).

## Přehled produktů

Cílová stránka je [Heureka.cz – Grafické karty AMD Radeon RX 9070
XT](https://graficke-karty.heureka.cz/f:2642:82902041/), tedy srovnání napříč
obchody – pro každý model se bere jeho aktuálně nejnižší nabízená cena.
