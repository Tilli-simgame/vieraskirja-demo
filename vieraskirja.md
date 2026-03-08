---
layout: default
title: Vieraskirja
theme: muuta
---

<link rel="stylesheet" href="{{ '/assets/css/guestbook.css' | relative_url }}">

<div class="guestbook-container">
    <h1>Vieraskirja</h1>

    <div class="gb-nav">
        <a href="#messages-list">Lue viestejä</a>
        <a href="{{ '/vieraskirja/kirjoita.html' | relative_url }}" style="font-weight: bold; border: 1px solid #4b0082; padding: 2px 8px; border-radius: 4px;">Kirjoita vieraskirjaan</a>
        <span>Yhteensä <span id="msg-count">...</span> viestiä</span>
    </div>

    <div class="messages-list" id="messages-list">
        <div class="loading">Sivua ladataan...</div>
    </div>
</div>

<script>
    const API_URL = 'https://guestbook.anniina-sipria.workers.dev/api/guestbook';

    const messagesList = document.getElementById('messages-list');
    const msgCount = document.getElementById('msg-count');

    async function fetchMessages() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Haku epäonnistui');
            const messages = await response.json();
            
            msgCount.textContent = messages.length;

            if (messages.length === 0) {
                messagesList.innerHTML = '<div class="loading">Ei vielä viestejä. Ole ensimmäinen!</div>';
                return;
            }

            messagesList.innerHTML = messages.map(m => `
                <div class="message-item">
                    <div class="message-meta">
                        <div class="meta-row"><span class="meta-label">Nimi :</span> <span class="meta-value">${escapeHtml(m.name)}</span></div>
                        ${m.email ? `<div class="meta-row"><span class="meta-label">S-posti :</span> <span class="meta-value">${escapeHtml(m.email)}</span></div>` : ''}
                        ${m.website ? `<div class="meta-row"><span class="meta-label">Tallisi nimi:</span> <span class="meta-value">${m.url ? `<a href="${escapeHtml(m.url)}" target="_blank">${escapeHtml(m.website)}</a>` : escapeHtml(m.website)}</span></div>` : (m.url ? `<div class="meta-row"><span class="meta-label">Tallin URL:</span> <span class="meta-value"><a href="${escapeHtml(m.url)}" target="_blank">${escapeHtml(m.url)}</a></span></div>` : '')}
                        ${m.rating ? `<div class="meta-row"><span class="meta-label">Arvosana tallille :</span> <span class="meta-value">${escapeHtml(m.rating)}</span></div>` : ''}
                        <div class="meta-row" style="margin-top: 15px;"><span class="meta-label">Viesti :</span> <span class="meta-value">${escapeHtml(m.message)}</span></div>
                    </div>
                    <div class="message-date">${formatDate(m.created_at)}</div>
                </div>
            `).join('');
        } catch (err) {
            messagesList.innerHTML = '<div class="error-message">Virhe viestien latauksessa.</div>';
            console.error(err);
        }
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        const months = ["tammikuuta", "helmikuuta", "maaliskuuta", "huhtikuuta", "toukokuuta", "kesäkuuta", "heinäkuuta", "elokuuta", "syyskuuta", "lokakuuta", "marraskuuta", "joulukuuta"];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const time = d.toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        return `${day}. ${month} ${year} ${time}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    fetchMessages();
</script>
