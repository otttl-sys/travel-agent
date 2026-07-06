# Vagamundo — Design-Handoff für Claude Code (Warp)

Dieses Paket bringt das Vagamundo-Design in dein bestehendes Travel-Agent-Repo.
Drei Teile: **Tokens**, **Referenz-Mockup**, **Komponenten-Notizen**.

```
handoff/
├─ README.md                     ← diese Datei
├─ tokens.css                    ← Farben + Typo-Skala (Otto UI Kit)
└─ vagamundo-reference.html      ← komplettes Mockup, standalone (offline öffnbar)
```

---

## Schritt für Schritt (in Warp)

1. **Paket ins Repo legen**
   Lade den `handoff/`-Ordner herunter und kopiere ihn in dein Projekt, z. B. nach
   `docs/design/` oder `design/`.

2. **Committen**
   ```bash
   git add design/
   git commit -m "design: Vagamundo reference + tokens"
   ```

3. **Tokens übernehmen**
   Füge den Inhalt von `tokens.css` in deine `src/app/globals.css` ein (additiv —
   nichts Bestehendes überschreiben). Die Tokens sind Tailwind v4 / OKLCH und
   funktionieren mit shadcn.

4. **Fonts einbinden** — in `app/layout.tsx` (`<head>`) oder via `next/font`:
   ```html
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
   ```
   - `Instrument Serif` → Headlines (`--font-heading`)
   - `Hanken Grotesk` → Body/UI (`--font-body`)

5. **Claude Code den Rest bauen lassen.** Öffne Claude in Warp im Projektordner
   und gib ihm die Referenz als Kontext (Beispiel-Prompt unten).

---

## Prompt-Vorlage für Claude Code

> In `design/vagamundo-reference.html` ist mein Ziel-Design (komplettes Mockup,
> alles inline). Die Design-Tokens in `design/tokens.css` habe ich bereits in
> `globals.css` übernommen.
>
> Baue die **Landing-Hero-Section** als React/Next-Komponente nach
> (`components/landing/Hero.tsx`). Nutze ausschließlich die Tokens
> (`var(--brand)`, `text-display`, etc.) — keine neuen Farben erfinden.
> Tailwind-Klassen wo möglich, sonst CSS-Variablen.
>
> Danach machen wir die **Trip-Workspace-Split-View** und die **Mobile-Screens**.

> ⚠️ Wichtig: Claude Code arbeitet am besten aus **Code** (die HTML-Referenz),
> nicht aus Screenshots.

---

## Screen-Inventar (komplett)

Das Mockup deckt jetzt **alle Routen von vagamundo.ai** ab, Web + Mobile:

**Web (1440px):** Landing (2 Varianten: konzeptionell + originalgetreue Gesamtseite
mit Pricing-Sektion), Landing eingeloggt (personalisiert), Trip Workspace,
Plan-Wizard (`/plan`), Explore (`/explore`), Saved Trips (`/saved`),
Research (`/research`), Disruption (`/disruption`).

**Mobile (390×844):** Discover (+ 3 Persona-Varianten: Neu-Nutzer / Foodie / Familie),
AI Chat, Itinerary, Pricing, Checkout, Budget checker (`/budget`),
Packing list (`/packing`), Plan-Wizard, Explore, My trips, Research, Disruption.

**Dark Mode:** Jeder Screen existiert zusätzlich als „— Dark"-Variante im Mockup
(unterer Canvas-Bereich). Implementierung: die `.dark`-Tokens in `tokens.css`
sind die Quelle der Wahrheit — Klasse `dark` auf `<html>` toggeln (z. B. via
`next-themes`), KEINE hartcodierten Dark-Farben in Komponenten.
Dark-Regeln: Cards heben sich vom Page-BG ab (`oklch(0.215 0.01 60)` auf
`oklch(0.17 0.008 60)`), Brand wird heller (`oklch(0.7 0.17 35)`), Borders
`oklch(0.3–0.32 0.01 60)`, Sekundärtext `oklch(0.62 0.01 60)`.

## Personalisierung (gilt für die GANZE Website)

Die UI baut sich pro Nutzerprofil dynamisch um. Stufen:

1. **Anonym** — Standard-UI, keine Personalisierung (Landing = Schaufenster).
2. **Nach erstem Prompt** — Chips & Vorschläge spiegeln eingegebene Präferenzen
   (Budget, Reisestil) noch in derselben Session.
3. **Sign-up + 1. Trip** — „Continue planning"-Karte, „While you were away"-
   Agenten-Updates, abgestimmte Vorschläge, relevante Agenten prominent.
4. **Ab ~3 Trips** — gelernte Muster, Match-Scores („92% match"), Reise-Stats
   („Your travel year"), proaktive Alerts (Preise, Schulferien).

Pro Route:
- **Landing/Discover** — Modul-Reihenfolge nach Profil (Foodie: Culinary routes;
  Familie: Kid-friendly + Ferien-Alert + Familienbudget; Neu: How-it-works).
- **Prompt-Chips** — aus der Historie generiert („Porto again?", „Ski week like
  last January"). Erster Chip = stärkster Match, in `--brand-subtle` hervorgehoben.
- **Explore** — Ranking + Badges nach Profil (Match-%, KIDS 4–10, POOL VILLA).
- **Trip Workspace** — profilrelevante Agenten zuerst im Rail & Chat-Dock.
- **Plan-Wizard** — Defaults vorbefüllt (Reisende, Budgetrahmen, Reisezeit).
- **Budget/Pricing** — Referenzwerte aus bisherigen Trips.
- **Dichte** — Power-User kompakt, Neue geführt.

Datenmodell-Hinweis: ein `UserProfile` (traits: cuisine-affinity, budget-band,
party-size, seasons, pace) speist alle Module; jedes Modul deklariert, welche
Traits es konsumiert. Referenz-Screens: „Landing — eingeloggt" + die drei
Mobile-Discover-Personas im Mockup.

Empfohlene Implementierungs-Reihenfolge: Landing → Plan → Workspace/Itinerary →
Explore/Trips → Tools (Budget, Packing, Research, Disruption) → Pricing/Checkout.

## Komponenten-Notizen

### Web
- **Landing** — Header (Logo + Nav + CTA), Hero mit „Where to next?" + Prompt-Bar
  + Chip-Vorschläge, Destinations-Grid (4 Karten), dunkle „8 Agenten"-Sektion (4×2 Grid).
- **Trip Workspace** — 3-Spalten-Split:
  `Itinerary-Rail (300px) · Day-Timeline (1fr) · Map (1fr)`.
  Map hat Route + nummerierte Pins; unten schwebt ein „Agents working"-Chat-Dock.

### Mobile (390×844)
- **Discover** — Such-Prompt, Chips, „Continue planning"-Hero-Karte mit Fortschritt,
  „Trending"-Horizontal-Scroll, Tab-Bar (Discover/Trips/Chat/Profile).
- **AI Chat** — Header mit „3 agents active", Bubbles (User = terracotta,
  Agent = weiß), eingebettete Vorschlags-Karte, Typing-Indicator, Input-Bar.
- **Itinerary** — Foto-Header mit Titel, Tages-Tabs, vertikale Timeline mit
  Zeit + Foto-Thumbnails, Footer mit Tagessumme + „Open map".

### Wiederkehrende Patterns (lohnen sich als Komponente)
- `DestinationCard` — Foto + Titel + Rating + Preis + „Plan trip".
- `TimelineStop` — Punkt + Foto-Thumb + Titel + Agent-Badge + Meta.
- `AgentBadge` — Pill in `--brand-subtle`/`--sage-subtle` mit Agent-Name.
- `AgentAvatarStack` — überlappende Kreis-Avatare mit Agent-Icon.
- `PromptBar` — Input mit Globus-Icon links + Send-Button rechts.

### Farb-Logik
- **Terracotta (`--brand`)** = primäre Aktionen, Food-Agent, aktive Zustände.
- **Sage (`--sage`)** = Activities-Agent, sekundäre Akzente.
- **Dunkel** = `oklch(0.18 0.008 60)` für die Agenten-Sektion + dunkle Buttons.
- Surfaces warm-neutral (`--surface`, `--surface-sunken`).
- Fotos: echte Destination-Bilder mit Gradient-Fallback dahinter.
