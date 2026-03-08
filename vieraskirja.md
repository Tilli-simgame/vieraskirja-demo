---
layout: default
title: Vieraskirja
theme: muuta
---

<link rel="stylesheet" href="{{ '/assets/css/guestbook.css' | relative_url }}">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="guestbook-container">
    <div class="guestbook-form">
        <h3>Jätä terveisesi!</h3>
        <form id="gb-form">
            <div class="form-group">
                <label for="name">Nimi:</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="message">Viesti:</label>
                <textarea id="message" name="message" required></textarea>
            </div>
            <!-- Turnstile Widget -->
            <div class="cf-turnstile" data-sitekey="0x4AAAAAACn-0CzwlsyjJaLi" style="margin-bottom: 15px;"></div>
            
            <button type="submit" class="submit-btn" id="submit-btn">Lähetä</button>
        </form>
        <div id="form-status" style="margin-top: 10px; font-weight: bold;"></div>
    </div>

    <div class="messages-list" id="messages-list">
        <div class="loading">Ladataan viestejä...</div>
    </div>
</div>

<script>
    const API_URL = 'https://guestbook.anniina-sipria.workers.dev/api/guestbook'; // PÄIVITÄ TÄMÄ MYÖHEMMIN

    const messagesList = document.getElementById('messages-list');
    const gbForm = document.getElementById('gb-form');
    const formStatus = document.getElementById('form-status');

    async function fetchMessages() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Haku epäonnistui');
            const messages = await response.json();
            
            if (messages.length === 0) {
                messagesList.innerHTML = '<div class="loading">Ei vielä viestejä. Ole ensimmäinen!</div>';
                return;
            }

            messagesList.innerHTML = messages.map(m => `
                <div class="message-item">
                    <div class="message-header">
                        <span>${escapeHtml(m.name)}</span>
                        <span class="message-date">${new Date(m.created_at).toLocaleDateString('fi-FI')}</span>
                    </div>
                    <div class="message-text">${escapeHtml(m.message)}</div>
                </div>
            `).join('');
        } catch (err) {
            messagesList.innerHTML = '<div class="error-message">Virhe viestien latauksessa.</div>';
            console.error(err);
        }
    }

    gbForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        formStatus.textContent = 'Lähetetään...';

        const data = {
            name: document.getElementById('name').value,
            message: document.getElementById('message').value,
            'cf-turnstile-response': document.querySelector('[name="cf-turnstile-response"]').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Lähetys epäonnistui');
            
            formStatus.style.color = 'green';
            formStatus.textContent = 'Viesti lähetetty!';
            gbForm.reset();
            fetchMessages();
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

    fetchMessages();
</script>
