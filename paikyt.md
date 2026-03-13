---
layout: default
title: Hevosen Päiväkirja
theme: horse-profile
---

<link rel="stylesheet" href="{{ '/assets/css/guestbook.css' | relative_url }}">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="guestbook-container">
    <h1>Hevosen Päiväkirja</h1>
    <h2 id="horse-name-display" style="text-transform: uppercase;">Ladataan...</h2>
    <hr>
    
    <div class="horse-diary-container">
        <div class="gb-nav">
            <a href="{{ '/hevoset/tallin-hevoset.html' | relative_url }}">&larr; Takaisin hevoslistaan</a>
            <a href="#diary-form-tag">Kirjoita hoitopäikkyyn</a>
        </div>

        <div class="horse-diary-form" id="diary-form-tag" style="margin-top: 20px;">
            <h3>Kirjoita päiväkirjaan</h3>
            <p style="font-size: 0.9em; margin-bottom: 10px; text-align: center;">Kirjoita hevosen
                kuulumisia tai hoitotoimenpiteitä!</p>
            <form id="diary-form-el">
                <div class="form-group">
                    <label for="diary-name">Nimi / Kuka olet:</label>
                    <input type="text" id="diary-name" name="name" required placeholder="Nimesi">
                </div>
                <div class="form-group">
                    <label for="diary-message">Viesti:</label>
                    <textarea id="diary-message" name="message" required
                        placeholder="Mitä teitte tänään?"></textarea>
                </div>
                <!-- Turnstile Widget -->
                <div class="cf-turnstile" data-sitekey="0x4AAAAAACn-0CzwlsyjJaLi"
                    style="margin-bottom: 15px;"></div>
                <button type="submit" class="submit-btn" id="diary-submit-btn" style="width: 100%;">Tallenna
                    merkintä</button>
            </form>
            <div id="diary-form-status" style="margin-top: 10px; font-weight: bold; text-align: center;">
            </div>
        </div>

        <h3 style="margin-top: 30px; text-align: center;">Aiemmat merkinnät</h3>
        <div class="messages-list" id="diary-list">
            <div class="loading">Ladataan merkintöjä...</div>
        </div>
    </div>
</div>

<script>
    (function () {
        const API_URL = 'https://guestbook.anniina-sipria.workers.dev/api/horse-diary';
        const urlParams = new URLSearchParams(window.location.search);
        const horseSlug = urlParams.get('horse');

        const diaryList = document.getElementById('diary-list');
        const diaryForm = document.getElementById('diary-form-el');
        const diaryStatus = document.getElementById('diary-form-status');
        const horseNameDisplay = document.getElementById('horse-name-display');

        if (!horseSlug) {
            horseNameDisplay.textContent = "Hevosta ei valittu";
            diaryList.innerHTML = '<div class="error-message">Virhe: Hevosta ei ole valittu URL-parametrilla. Palaa takaisin hevosen sivulle ja yritä sieltä uudelleen.</div>';
            diaryForm.style.display = 'none';
            return;
        }

        // Voi parantaa hakemalla oikean nimen hevoslistasta tms tulevaisuudessa.
        // Nyt näytetään horseSlug ensimmäisellä isolla kirjaimella jos nimeä ei ole
        horseNameDisplay.textContent = horseSlug.charAt(0).toUpperCase() + horseSlug.slice(1).replace(/-/g, ' ');

        async function fetchDiary() {
            try {
                const response = await fetch(`${API_URL}?horse=${horseSlug}`);
                if (!response.ok) throw new Error('Haku epäonnistui');
                const messages = await response.json();

                if (messages.length === 0) {
                    diaryList.innerHTML = '<div class="loading">Ei vielä merkintöjä tällä hevosella. Ole ensimmäinen!</div>';
                    return;
                }

                diaryList.innerHTML = messages.map(m => `
                    <div class="message-item">
                        <div class="message-meta">
                            <div class="meta-row"><span class="meta-label">Hoitaja :</span> <span class="meta-value">${escapeHtml(m.name)}</span></div>
                            <div class="meta-row" style="margin-top: 15px;"><span class="meta-label">Merkintä :</span> <span class="meta-value">${escapeHtml(m.message)}</span></div>
                        </div>
                        <div class="message-date">${formatDate(m.created_at)}</div>
                    </div>
                `).join('');
            } catch (err) {
                diaryList.innerHTML = '<div class="error-message">Virhe merkintöjen latauksessa.</div>';
                console.error(err);
            }
        }

        function formatDate(dateStr) {
            const d = new Date(dateStr);
            const months = ["tammikuuta", "helmikuuta", "maaliskuuta", "huhtikuuta", "toukokuuta", "kesäkuuta", "heinäkuuta", "elokuuta", "syyskuuta", "lokakuuta", "marraskuuta", "joulukuuta"];
            const day = d.getDate();
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            const time = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `${day}. ${month} ${year} ${time}`;
        }

        diaryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('diary-submit-btn');
            submitBtn.disabled = true;
            diaryStatus.textContent = 'Tallennetaan...';

            const token = document.querySelector('#diary-form-tag [name="cf-turnstile-response"]')?.value;
            if (!token) {
                diaryStatus.style.color = 'orange';
                diaryStatus.textContent = 'Ole hyvä ja suorita spämmitarkistus.';
                submitBtn.disabled = false;
                return;
            }

            const data = {
                horse_slug: horseSlug,
                name: document.getElementById('diary-name').value,
                message: document.getElementById('diary-message').value,
                'cf-turnstile-response': token
            };

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) throw new Error('Lähetys epäonnistui');

                diaryStatus.style.color = 'green';
                diaryStatus.textContent = 'Merkintä tallennettu!';
                diaryForm.reset();
                if (window.turnstile) window.turnstile.reset();
                fetchDiary();
            } catch (err) {
                diaryStatus.style.color = 'red';
                diaryStatus.textContent = 'Virhe tallennuksessa.';
                console.error(err);
            } finally {
                submitBtn.disabled = false;
            }
        });

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        fetchDiary();
    })();
</script>
