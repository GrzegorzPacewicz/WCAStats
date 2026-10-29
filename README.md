# WCA Stats

**Live:** https://wcastats.grzegorzpacewicz.pl/

Dashboard analityczny danych WCA (World Cube Association) dla zawodow speedcubing.
Pobiera dane z WCA API v0 i wizualizuje statystyki zawodow oraz spolecznosci.

## Funkcjonalnosci

Aplikacja ma trzy zakladki:

### Rok
- Wybor kraju i roku
- Karty statystyk: unikalni zawodnicy, podzial plci, debiutanci, liczba zawodow
- Wykres zawodow per miesiac
- Lista zawodow z liczba uczestnikow (klikalne)
- Modal wynikow zawodow po eventach
- Modal profilu zawodnika z rekordami osobistymi i medalami

### Statystyki (wszystkie lata lacznie)
- Rozwoj spolecznosci przez lata (zawody, aktywni, debiutanci)
- Podzial plci przez lata (klikalny)
- Sezonowosc
- Popularnosc konkurencji + trendy przez lata
- Cykl zycia konkurencji (pierwszy/ostatni rok eventu)
- Debiutanci vs powracajacy zawodnicy
- Srednia wielkosc zawodow i liczba konkurencji
- Rozklad wielkosci zawodow
- Rozrost geograficzny (miasta narastajaco)
- Miasta z najwieksza liczba zawodow
- Najwieksze zawody, rekordowe lata, srednie

### Admin (ukryta za `#admin`)
- Reczne odswiezanie i pobieranie danych do cache

## Stack

- React 19 + Vite 8
- Tailwind CSS 4
- Recharts
- PocketBase (wspoldzielony cache)
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

Output w `dist/` - gotowy do deploy.

## Cache

Dwupoziomowy:
1. **PocketBase** (`https://gp1.pecet.it`, kolekcja `wca_cache`) - wspoldzielony miedzy uzytkownikami
2. **localStorage** - fallback gdy PocketBase niedostepny

Klucz: `wca-{kraj}-{rok}`.

## API

Dane z https://www.worldcubeassociation.org/api/v0

- `/competitions` - lista zawodow
- `/competitions/:id/competitors` - uczestnicy
- `/competitions/:id/results` - wyniki
- `/persons/:wca_id` - profil zawodnika

## Skrypty

- `node scripts/prefetch.js [startYear] [endYear]` - laduje dane PL do PocketBase (300ms delay, rate limiting)
- `node scripts/eligibility.js all` - liczy zawodnikow uprawnionych do Polish Championship 2026 (output: `uprawnieni_*.csv`)

## Deploy

Cloudflare Pages - automatyczny deploy z GitHub przy pushu do `main`.
Build command: `npm run build`, output: `dist`.
