# Vieraskirja demo

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

### 4. Turnstile (CAPTCHA)

Jotta estät roskapostin, luo ilmainen Turnstile-tili ja hanki avaimet:

1. Mene osoitteeseen: [https://www.turnstile.dev/](https://www.turnstile.dev/)
2. Rekisteröidy ja luo uusi sivu (Site).
3. Ota talteen **Site Key** ja **Secret Key**.
4. Lisää Workerin ympäristömuuttujat (Settings -> Variables):
   - `TURNSTILE_SITE_KEY`: (Site Key)
   - `TURNSTILE_SECRET_KEY`: (Secret Key)

### 5. Ylläpitopaneeli ja GitHub-kirjautuminen (OAuth)

Jotta voit hallita viestejä ylläpito-osoitteessa `/admin/`, sinun on luotava GitHub OAuth App:

1. Mene GitHubissa: **Settings** -> **Developer settings** -> **OAuth Apps** -> **New OAuth App**.
2. Täytä tiedot:
   - **Application name**: `Vieraskirja Demo Admin`
   - **Homepage URL**: Sivustosi osoite (esim. `https://tilli-simgame.github.io/vieraskirja-demo/`)
   - **Authorization callback URL**: Workerisi URL + `/api/admin/auth/github/callback`
3. Luo sovellus ja ota talteen **Client ID** ja **Client Secret**.
4. Lisää Workerin ympäristömuuttujat (Settings -> Variables):
   - `GITHUB_CLIENT_ID`: (Client ID)
   - `GITHUB_CLIENT_SECRET`: (Client Secret)
   - `ALLOWED_GITHUB_USERS`: `käyttäjänimesi1,käyttäjänimesi2`
   - `SESSION_SECRET`: Pitkä satunnainen merkkijono (esim. `openssl rand -base64 32`)
   - `FRONTEND_URL`: `https://tilli-simgame.github.io/vieraskirja-demo`
