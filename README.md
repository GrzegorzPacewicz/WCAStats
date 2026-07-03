# WCA Stats

**Live:** https://wcastats.grzegorzpacewicz.pl/

Dashboard analityczny danych WCA (World Cube Association) dla zawodow speedcubing.

## Funkcjonalnosci

- Wybor kraju i roku
- Statystyki: unikalni zawodnicy, podzial plci, nowi zawodnicy (debiutanci)
- Lista zawodow z liczba uczestnikow
- Wykres zawodow per miesiac (BarChart)
- Wyniki zawodow po eventach (modal)
- Profile zawodnikow z rekordami osobistymi i medalami (modal)
- Cache danych w localStorage

## Stack

- React 19 + Vite 8
- Tailwind CSS 4
- Recharts
- WCA API v0

## Uruchomienie

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output w `dist/` - gotowy do deploy na Cloudflare Pages.

## API

Dane pobierane z https://www.worldcubeassociation.org/api/v0

Endpointy:
- `/competitions` - lista zawodow
- `/competitions/:id/competitors` - uczestnicy
- `/competitions/:id/results` - wyniki
- `/persons/:wca_id` - profil zawodnika

## Deploy

Cloudflare Workers:
- Build command: `npm run build`
- Output directory: `dist`
