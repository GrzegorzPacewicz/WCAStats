# WCA Stats - Context

## Projekt

Dashboard analityczny dla danych WCA (speedcubing). Pobiera dane z WCA API v0 i wyswietla statystyki zawodow i zawodnikow.

## Struktura

```
src/
  api/wca.js          - fetch z WCA API, paginacja, cache localStorage
  components/
    CountryPicker.jsx - dropdown krajow
    YearPicker.jsx    - dropdown lat
    StatsSummary.jsx  - karty ze statystykami
    CompetitionList.jsx - lista zawodow (klikalne)
    Chart.jsx         - BarChart zawodow per miesiac
    PersonModal.jsx   - profil zawodnika (rekordy, medale)
    ResultsModal.jsx  - wyniki zawodow po eventach
  App.jsx             - glowny komponent, state, modale
```

## API WCA v0

Base: `https://www.worldcubeassociation.org/api/v0`

- `GET /competitions?country_iso2={kod}&start={rok}-01-01&end={rok}-12-31&page={n}` - 25/strona
- `GET /competitions/{id}/competitors` - uczestnicy
- `GET /competitions/{id}/results` - wyniki (eventy, rundy, czasy)
- `GET /persons/{wca_id}` - profil (rekordy osobiste, medale, statystyki)

## Cache

Dwupoziomowy cache:
1. **PocketBase** (`https://gp1.pecet.it`) - wspoldzielony cache miedzy uzytkownikami, kolekcja `wca_cache`
2. **localStorage** - fallback gdy PocketBase niedostepny

Klucz: `wca-{kraj}-{rok}`. Przycisk "Odswiez" wymusza ponowne pobranie i aktualizuje oba cache.

## Deploy

Cloudflare Pages - automatyczny deploy z GitHub przy pushu do `main`.
Build: `npm run build`, output: `dist/`
Live: `https://wcastats.grzegorzpacewicz.pl`
