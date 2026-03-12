---
layout: default
title: Lehmuskartanon Ratsastuskoulun tuntikirja
theme: toiminta
---

<link rel="stylesheet" href="{{ '/assets/css/guestbook.css' | relative_url }}">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="guestbook-container">
    <h1>Lehmuskartanon Ratsastuskoulu</h1>
    <h2>TUNTIKIRJA</h2>
    <hr>
    <img src="{{ '/assets/img/uni1.gif' | relative_url }}" alt="" class="guestbook-header-img">

    <div class="gb-nav">
        <a href="{{ '/toiminta/tuntikirja.html' | relative_url }}"> Takaisin tuntikirjaan</a>
    </div>

    <div class="guestbook-form" id="gb-form">
        <h3>Kirjaa tuntisi!</h3>
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
                <label for="horse">Ratsu :</label>
                <select id="horse" name="horse" required>
                    <option value="">-- Valitse ratsu --</option>
                    <option value="Greenfield's Thunder &quot;Tarmo&quot; (Irlannincob-ruuna)">Greenfield's Thunder "Tarmo" (Irlannincob-ruuna)</option>
                    <option value="Hankien Helmi &quot;Lumikki&quot; (Suomenhevonen-tamma)">Hankien Helmi "Lumikki" (Suomenhevonen-tamma)</option>
                    <option value="Highland Lady &quot;Hilla&quot; (Newforestinponi-tamma)">Highland Lady "Hilla" (Newforestinponi-tamma)</option>
                    <option value="Just a Dream &quot;Jade&quot; (Belgianpuoliverinen-tamma)">Just a Dream "Jade" (Belgianpuoliverinen-tamma)</option>
                    <option value="Kukkakummun Veikeä Ville &quot;Ville&quot; (Shetlanninponi-ruuna)">Kukkakummun Veikeä Ville "Ville" (Shetlanninponi-ruuna)</option>
                    <option value="Mynta frá Sauðárkróki &quot;Minttu&quot; (Islanninhevonen-tamma)">Mynta frá Sauðárkróki "Minttu" (Islanninhevonen-tamma)</option>
                    <option value="Noble Knight &quot;Noppa&quot; (Ratsuponi-ruuna)">Noble Knight "Noppa" (Ratsuponi-ruuna)</option>
                    <option value="Sweetie The Heartbreaker &quot;Herkku&quot; (Shetlanninponi-ruuna)">Sweetie The Heartbreaker "Herkku" (Shetlanninponi-ruuna)</option>
                    <option value="Thunderbolting'n Very Frightening Z &quot;Salama&quot; (Zangersheide-ori)">Thunderbolting'n Very Frightening Z "Salama" (Zangersheide-ori)</option>
                    <option value="Tuiskutulinen &quot;Tuisku&quot; (Suomenhevonen-ruuna)">Tuiskutulinen "Tuisku" (Suomenhevonen-ruuna)</option>
                    <option value="Victorious Quest &quot;Vikke&quot; (Connemaranponi-ruuna)">Victorious Quest "Vikke" (Connemaranponi-ruuna)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="lesson_type">Tunti :</label>
                <select id="lesson_type" name="lesson_type" required>
                    <option value="">-- Valitse tunti --</option>
                    <option value="Alkeiskurssi">Alkeiskurssi</option>
                    <option value="Este - alkeet">Este - alkeet</option>
                    <option value="Este - edistyneet">Este - edistyneet</option>
                    <option value="Kenttä - alkeet">Kenttä - alkeet</option>
                    <option value="Kenttä - edistyneet">Kenttä - edistyneet</option>
                    <option value="Kengittäjä kurssi">Kengittäjä kurssi</option>
                    <option value="Koulu - alkeet">Koulu - alkeet</option>
                    <option value="Koulu - edistyneet">Koulu - edistyneet</option>
                    <option value="Talutusratsastus">Talutusratsastus</option>
                    <option value="Valjaskurssi">Valjaskurssi</option>
                    <option value="Vikellys">Vikellys</option>
                    <option value="Yksityistunti">Yksityistunti</option>
                </select>
            </div>
            <div class="form-group">
                <label for="message">Tuntitarina :</label>
                <textarea id="message" name="message" required placeholder="Kerro miten tuntisi meni..."></textarea>
            </div>
            <!-- Turnstile Widget -->
            <div class="cf-turnstile" data-sitekey="0x4AAAAAACn-0CzwlsyjJaLi" style="margin-bottom: 10px;"></div>

            <button type="submit" class="submit-btn" id="submit-btn" style="width: 100%;">Lähetä tuntikirjaus!</button>
        </form>
        <div id="form-status" style="margin-top: 10px; font-weight: bold; text-align: center;"></div>
    </div>
</div>

<script>
    const API_URL = 'https://guestbook.anniina-sipria.workers.dev/api/tuntikirja';
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
            horse: document.getElementById('horse').value,
            lesson_type: document.getElementById('lesson_type').value,
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
            formStatus.innerHTML = 'Tuntikirjaus lähetetty! <br><a href="{{ "/toiminta/tuntikirja.html" | relative_url }}">Palaa takaisin tuntikirjaan tästä.</a>';
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
</script>

<div style="margin-top: 30px; text-align: center; font-size: 0.8em; color: #999;">
    inspired by freebok.net
</div>
