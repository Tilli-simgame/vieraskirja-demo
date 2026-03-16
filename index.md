---
layout: default
title: Vieraskirja Demo
theme: muuta
---

<link rel="stylesheet" href="{{ '/assets/css/guestbook.css' | relative_url }}">

<div class="guestbook-container">
    <h1>Vieraskirja Demo</h1>

    <div class="guestbook-rules">
        <ul>
            <li><strong>Ole kohtelias:</strong> Kirjoita asiallisesti ja ystävällisesti. Muista, että ruudun takana on toinen ihminen.</li>
            <li><strong>Pysy aiheessa:</strong> Vieraskirja on tarkoitettu virtuaalihevosaiheiseen keskusteluun. Pidä kommentit aiheessa.</li>
            <li><strong>Ei mainostamista:</strong> Tämä ei ole mainospalsta!</li>
            <li><strong>Ei vihapuhetta tai spämmäystä:</strong> Asiaton kielenkäyttö, kiroilu ja saman viestin toistaminen (spämmi) johtaa viestin poistoon.</li>
            <li><strong>Omalla nimimerkillä:</strong> Käytä mielellään virtuaali nikkiäsi.</li>
        </ul>
    </div>

    <div class="gb-pagination">
        <div class="pagination-cell">
            Viestit <span id="current-range">...</span>
        </div>
        <div class="pagination-cell">
            Yhteensä <span id="total-count">...</span> viestiä
        </div>
        <div class="pagination-cell">
            <a href="#" id="next-page" class="nav-disabled">Seuraavat 10 viestiä</a>
        </div>
        <div class="pagination-cell">
            <a href="{{ '/vieraskirja/kirjoita.html' | relative_url }}">Kirjoita vieraskirjaan</a>
        </div>
        <div class="pagination-cell">
            <a href="#" id="prev-page" class="nav-disabled">Edelliset 10 viestiä</a>
        </div>
    </div>

    <div class="messages-list" id="messages-list">
        <div class="loading">Sivua ladataan...</div>
    </div>

    <div class="gb-pagination">
        <div class="pagination-cell">
            <a href="#" id="next-page-bottom" class="nav-disabled">Seuraavat 10 viestiä</a>
        </div>
        <div class="pagination-cell">
            <a href="{{ '/vieraskirja/kirjoita.html' | relative_url }}">Kirjoita vieraskirjaan</a>
        </div>
        <div class="pagination-cell">
            <a href="#" id="prev-page-bottom" class="nav-disabled">Edelliset 10 viestiä</a>
        </div>
    </div>
</div>

<script>
    const API_URL = 'https://gb-demo.anniina-sipria.workers.dev/api/guestbook';
    const LIMIT = 10;
    let currentOffset = 0;

    const messagesList = document.getElementById('messages-list');
    const totalCountSpan = document.getElementById('total-count');
    const currentRangeSpan = document.getElementById('current-range');
    
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    const nextBtnBottom = document.getElementById('next-page-bottom');
    const prevBtnBottom = document.getElementById('prev-page-bottom');

    async function fetchMessages(offset = 0) {
        try {
            messagesList.innerHTML = '<div class="loading">Ladataan viestejä...</div>';
            const response = await fetch(`${API_URL}?limit=${LIMIT}&offset=${offset}`);
            if (!response.ok) throw new Error('Haku epäonnistui');
            
            const messages = await response.json();
            const totalCount = parseInt(response.headers.get('X-Total-Count')) || messages.length;
            
            totalCountSpan.textContent = totalCount;
            
            if (messages.length === 0 && offset > 0) {
                // Should not happen with valid buttons, but safe guard
                fetchMessages(0);
                return;
            }

            const rangeStart = totalCount > 0 ? offset + 1 : 0;
            const rangeEnd = offset + messages.length;
            currentRangeSpan.textContent = `${rangeStart} - ${rangeEnd}`;

            // Seuraavat (Next) -> Older messages (higher offset)
            if (offset + LIMIT < totalCount) {
                nextBtn.classList.remove('nav-disabled');
                nextBtnBottom.classList.remove('nav-disabled');
                const nextAction = (e) => {
                    e.preventDefault();
                    currentOffset += LIMIT;
                    fetchMessages(currentOffset);
                };
                nextBtn.onclick = nextAction;
                nextBtnBottom.onclick = nextAction;
            } else {
                nextBtn.classList.add('nav-disabled');
                nextBtnBottom.classList.add('nav-disabled');
                nextBtn.onclick = null;
                nextBtnBottom.onclick = null;
            }

            // Edelliset (Previous) -> Newer messages (lower offset)
            if (offset > 0) {
                prevBtn.classList.remove('nav-disabled');
                prevBtnBottom.classList.remove('nav-disabled');
                const prevAction = (e) => {
                    e.preventDefault();
                    currentOffset = Math.max(0, currentOffset - LIMIT);
                    fetchMessages(currentOffset);
                };
                prevBtn.onclick = prevAction;
                prevBtnBottom.onclick = prevAction;
            } else {
                prevBtn.classList.add('nav-disabled');
                prevBtnBottom.classList.add('nav-disabled');
                prevBtn.onclick = null;
                prevBtnBottom.onclick = null;
            }

            if (messages.length === 0) {
                messagesList.innerHTML = '<div class="loading">Ei vielä viestejä. Ole ensimmäinen!</div>';
                return;
            }

            messagesList.innerHTML = messages.map(m => `
                <div class="message-item">
                    <div class="message-meta">
                        <div class="meta-row"><span class="meta-label">Nimi :</span> <span class="meta-value">${escapeHtml(m.name)}</span></div>
                        ${m.email ? `<div class="meta-row"><span class="meta-label">@ :</span> <span class="meta-value">${escapeHtml(m.email)}</span></div>` : ''}
                        ${m.website ? `<div class="meta-row"><span class="meta-label">Tallin nimi:</span> <span class="meta-value">${m.url ? `<a href="${escapeHtml(m.url)}" target="_blank">${escapeHtml(m.website)}</a>` : escapeHtml(m.website)}</span></div>` : (m.url ? `<div class="meta-row"><span class="meta-label">www-osoite:</span> <span class="meta-value"><a href="${escapeHtml(m.url)}" target="_blank">${escapeHtml(m.url)}</a></span></div>` : '')}
                        ${m.rating ? `<div class="meta-row"><span class="meta-label">Arvosana tallille :</span> <span class="meta-value">${escapeHtml(m.rating)}</span></div>` : ''}
                        <div class="meta-row" style="margin-top: 15px;"><span class="meta-label">Viesti :</span> <span class="meta-value">${escapeHtml(m.message)}</span></div>
                    </div>
                    <div class="message-date">${formatDate(m.created_at)}</div>
                </div>
            `).join('');
            
            // Scroll to top of list after navigation
            if (offset > 0 || currentOffset > 0) {
                document.getElementById('messages-list').scrollIntoView({ behavior: 'smooth' });
            }

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

<div style="margin-top: 30px; text-align: center; font-size: 0.8em; color: #999;">
    inspired by freebok.net
</div>
