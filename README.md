# Lehmuskartanon Ratsastuskoulun vieraskirja

Tämä projekti on minimalistinen, Jekyll-pohjainen vieraskirjasivusto, joka käyttää Cloudflare Workersia ja D1-tietokantaa viestien tallentamiseen.

## Projektin rakenne

- `index.md`: Sivuston etusivu ja vieraskirjan käyttöliittymä.
- `vieraskirja/kirjoita.md`: Sivu, jolla käyttäjät voivat kirjoittaa uusia viestejä.
- `cloudflare/`: Sisältää API-toteutuksen (Worker) ja tietokantakaavion (SQL).
- `assets/css/guestbook.css`: Vieraskirjan tyylitiedosto.

## Paikallinen kehitys (Jekyll)

### Ohjelmistovaatimukset
- **Ruby** (v3.0+)
- **Bundler** (`gem install bundler`)

### Asennus ja ajo
1. Asenna riippuvuudet: `bundle install`
2. Käynnistä palvelin: `bundle exec jekyll serve`
3. Sivusto löytyy osoitteesta: `http://localhost:4000/vieraskirja-demo/`

## Cloudflare-taustajärjestelmän pystytys

Voit pystyttää vieraskirja-API:n joko komentoriviltä tai käsin.

### 1. Tietokanta (D1)
- Luo D1-tietokanta nimellä `db-demo`.
- Alusta tietokanta käyttäen tiedostoa `cloudflare/schema.sql`.

### 2. API (Worker)
- Luo uusi Cloudflare Worker nimeltä `gb-demo`.
- Liitä koodi tiedostosta `cloudflare/worker.js` Workerin editoriin.
- Lisää Workerille **D1 Database Binding**:
    - Variable name: `DB`
    - Database: `db-demo`

### 3. Yhdistäminen
- Kun Worker on julkaistu, kopioi sen URL (esim. `https://xxx.workers.dev`).
- Päivitä `index.md`-tiedostoon muuttuja `API_URL` vastaamaan uutta osoitettasi.

### 4. Spämmitarkistus (Turnstile)
- Luo Turnstile-widget Cloudflaressa.
- Lisää **Site Key** tiedostoon `vieraskirja/kirjoita.md`.
- Lisää **Secret Key** Workerin ympäristömuuttujaksi nimellä `TURNSTILE_SECRET_KEY`.
