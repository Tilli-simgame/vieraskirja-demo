---
layout: default
title: Demo vieraskirja
theme: muuta
---

<link rel="stylesheet" href="{{ '/assets/css/guestbook.css' | relative_url }}">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="guestbook-container">
    <h1>Demo vieraskirja</h1>

    <div class="guestbook-rules">
        <ul>
            <li><strong>Ole kohtelias:</strong> Kirjoita asiallisesti ja ystävällisesti. Muista, että ruudun takana on toinen ihminen.</li>
            <li><strong>Pysy aiheessa:</strong> Vieraskirja on tarkoitettu virtuaalihevosaiheiseen keskusteluun. Pidä kommentit aiheessa.</li>
            <li><strong>Ei mainostamista:</strong> Tämä ei ole mainospalsta!</li>
            <li><strong>Ei vihapuhetta tai spämmäystä:</strong> Asiaton kielenkäyttö, kiroilu ja saman viestin toistaminen (spämmi) johtaa viestin poistoon.</li>
            <li><strong>Omalla nimimerkillä:</strong> Käytä mielellään virtuaali nikkiäsi.</li>
        </ul>
    </div>

    <div class="gb-nav">
        <a href="{{ '/vieraskirja.html' | relative_url }}"> Takaisin vieraskirjaan</a>
    </div>

    <div class="guestbook-form" id="gb-form">
        <h3>Kiitos :)!</h3>
        <form id="gb-form-el">
            <div class="form-group">
                <label for="name">Nimi :</label>
                <input type="text" id="name" name="name" required placeholder="Nimesi">
            </div>
            <div class="form-group">
                <label for="email">@ :</label>
                <input type="email" id="email" name="email" placeholder="Sähköpostiosoitteesi (valinnainen)">
            </div>
            <div class="form-group">
                <label for="website">Tallin nimi:</label>
                <input type="text" id="website" name="website" placeholder="Talli">
            </div>
            <div class="form-group">
                <label for="url">www-osoite:</label>
                <input type="url" id="url" name="url" placeholder="https://...">
            </div>
            <div class="form-group">
                <label for="rating">Arvosana :</label>
                <input type="text" id="rating" name="rating" placeholder="Arvosana tallille">
            </div>
            <div class="form-group">
                <label for="message">Viesti :</label>
                <textarea id="message" name="message" required placeholder="Terveisesi..."></textarea>
            </div>
            <!-- Turnstile Widget -->
            <div class="cf-turnstile" data-sitekey="0x4AAAAAACrwJssqYp7vTZpx" style="margin-bottom: 10px;"></div>
            
            <button type="submit" class="submit-btn" id="submit-btn" style="width: 100%;">Lähetä terveisesi!</button>
        </form>
        <div id="form-status" style="margin-top: 10px; font-weight: bold; text-align: center;"></div>
    </div>
</div>

<script>
    const API_URL = 'https://guestbook.anniina-sipria.workers.dev/api/guestbook';
    const gbForm = document.getElementById('gb-form-el');
    const formStatus = document.getElementById('form-status');

    gbForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        formStatus.textContent = 'Lähetetään...';

        const token = document.querySelector('[name="cf-turnstile-response"]').value;
        if (!token) {
            formStatus.style.color = 'orange';
            formStatus.textContent = 'Ole hyvä ja suorita spämmitarkistus.';
            submitBtn.disabled = false;
            return;
        }

        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            url: document.getElementById('url').value,
            website: document.getElementById('website').value,
            rating: document.getElementById('rating').value,
            message: document.getElementById('message').value,
            'cf-turnstile-response': token
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Lähetys epäonnistui');
            
            formStatus.style.color = 'green';
            formStatus.innerHTML = 'Viesti lähetetty! <br><a href="{{ "/vieraskirja.html" | relative_url }}">Palaa takaisin lukemaan viestejä tästä.</a>';
            gbForm.reset();
            if (window.turnstile) window.turnstile.reset();
        } catch (err) {
            formStatus.style.color = 'red';
            formStatus.textContent = 'Virhe lähetyksessä.';
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
</script>

<div style="margin-top: 30px; text-align: center; font-size: 0.8em; color: #999;">
    inspired by freebok.net
</div>
