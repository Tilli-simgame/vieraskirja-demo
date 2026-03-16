# 🌈 Vieraskirja Demo

Tämä on moderni mutta retrohenkinen vieraskirja, joka yhdistää 2000-luvun alun estetiikan ja nykypäivän teknologiat. Se on toteutettu Jekyll-pohjaisena staattisena sivustona, ja sen dynaamiset toiminnot (kuten viestien tallennus ja ylläpitopaneeli) hoitaa **Cloudflare Workers** ja **D1-tietokanta**.

## ✨ Ominaisuudet

- **Reaaliaikaiset viestit**: Viestit tallentuvat D1-tietokantaan ja näkyvät heti.
- **Ylläpitopaneeli (`/admin/`)**: Hallitse viestejä, vastaa vieraille tai poista asiatonta sisältöä.
- **GitHub Login**: Turvallinen kirjautuminen ylläpitoon omalla GitHub-tunnuksellasi.
- **Spämmitarkistus**: Cloudflare Turnstile pitää botit loitolla.
- **Retro-estetiikka**: Inspiroitu vanhoista vieraskirjoista (esim. freebok.net).

---

## 🚀 Pystytysopas

### 1. Paikallinen kehitys (Jekyll)
1. Varmista, että koneellasi on **Ruby** ja **Bundler**.
2. Aja `bundle install`.
3. Käynnistä palvelin: `bundle exec jekyll serve`.
4. Avaa: `http://localhost:4000/vieraskirja-demo/`.

### 2. Cloudflare D1 -Tietokanta
1. Luo uusi D1-tietokanta nimellä `db-demo`.
2. Aja `cloudflare/schema.sql`-tiedoston sisältö tietokantaan (alustaa `messages`-taulun).

### 3. Cloudflare Worker (API)
1. Luo uusi Worker nimellä `gb-demo`.
2. Liitä `cloudflare/worker.js`-koodi editoriin.
3. Lisää **D1 Database Binding**:
   - Variable name: `DB`
   - Database: `db-demo`
4. Lisää seuraavat **Environment Variables** (Settings -> Variables):

| Muuttuja | Kuvaus | Esimerkki / Ohje |
| :--- | :--- | :--- |
| `TURNSTILE_SECRET_KEY` | Turnstile salainen avain | Cloudflare dashboardilta |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Alta (kohta 4) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Secret | Alta (kohta 4) |
| `ALLOWED_GITHUB_USERS` | Sallitut ylläpitäjät | `tunnus1,tunnus2` |
| `SESSION_SECRET` | Evästesalaisuus | Mikä tahansa pitkä satunnainen merkkijono |
| `FRONTEND_URL` | Sivustosi URL | `https://username.github.io/vieraskirja-demo` |

### 4. GitHub OAuth Setup (Admin-paneeli)
Jotta voit kirjaudua ylläpitoon:
1. Mene GitHubissa: **Settings** -> **Developer settings** -> **OAuth Apps** -> **New OAuth App**.
2. **Homepage URL**: `https://username.github.io/vieraskirja-demo/`
3. **Authorization callback URL**: `https://gb-demo.vauhtio.workers.dev/api/admin/auth/github/callback` (vaihda oma worker-osoitteesi).
4. Ota talteen ID ja Secret ja tallenna ne Workerin muuttujiin.

### 5. Viimeistely
- Päivitä `index.md`-tiedostoon (`API_URL`) oma Worker-osoitteesi.
- Päivitä `vieraskirja/kirjoita.md`-tiedostoon (`API_URL`) sama osoite sekä `data-sitekey` Turnstile-avaimesi.

---

## 🛠️ Teknologiat
- **Frontend**: Jekyll, Vanilla JS, CSS Custom Properties.
- **Backend**: Cloudflare Workers (CORS, GitHub OAuth, session management).
- **Database**: Cloudflare D1 (SQLite).
- **Security**: Cloudflare Turnstile, JWT-tyyliset sessiot evästeissä.
