---
layout: default
title: Lehmuskartanon Ratsastuskoulun tuntikirja
theme: toiminta
---

<link rel="stylesheet" href="{{ '/assets/css/guestbook.css' | relative_url }}">

<div class="guestbook-container">
    <h1>Lehmuskartanon Ratsastuskoulu</h1>
    <h2>TUNTIKIRJA</h2>
    <hr>
    <img src="{{ '/assets/img/uni1.gif' | relative_url }}" alt="" class="guestbook-header-img">

    <div class="guestbook-rules">
        <p>Täällä ratsastajat voivat jakaa tuntitarinansa! Kirjaa tuntisi tiedot ja kerro muille, miten tunti meni.</p>
    </div>

    <div class="gb-pagination">
        <div class="pagination-cell">
            <a href="{{ '/' | relative_url }}">Pääsivu</a>
        </div>
        <div class="pagination-cell">
            Merkinnät <span id="current-range">...</span>
        </div>
        <div class="pagination-cell">
            Yhteensä <span id="total-count">...</span> merkintää
        </div>
        <div class="pagination-cell">
            <a href="#" id="next-page" class="nav-disabled">Seuraavat 10</a>
        </div>
        <div class="pagination-cell">
            <a href="{{ '/toiminta/tuntikirja/kirjoita.html' | relative_url }}">Kirjaa tunti</a>
        </div>
        <div class="pagination-cell">
            <a href="#" id="prev-page" class="nav-disabled">Edelliset 10</a>
        </div>
    </div>

    <div class="messages-list" id="messages-list">
        <div class="loading">Sivua ladataan...</div>
    </div>

    <div class="gb-pagination">
        <div class="pagination-cell">
            <a href="#" id="next-page-bottom" class="nav-disabled">Seuraavat 10</a>
        </div>
        <div class="pagination-cell">
            <a href="{{ '/toiminta/tuntikirja/kirjoita.html' | relative_url }}">Kirjaa tunti</a>
        </div>
        <div class="pagination-cell">
            <a href="#" id="prev-page-bottom" class="nav-disabled">Edelliset 10</a>
        </div>
    </div>
</div>

<script>
    const API_URL = 'https://guestbook.anniina-sipria.workers.dev/api/tuntikirja';
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
            messagesList.innerHTML = '<div class="loading">Ladataan merkintöjä...</div>';
            const response = await fetch(`${API_URL}?limit=${LIMIT}&offset=${offset}`);
            if (!response.ok) throw new Error('Haku epäonnistui');

            const messages = await response.json();
            const totalCount = parseInt(response.headers.get('X-Total-Count')) || messages.length;

            totalCountSpan.textContent = totalCount;

            if (messages.length === 0 && offset > 0) {
                fetchMessages(0);
                return;
            }

            const rangeStart = totalCount > 0 ? offset + 1 : 0;
            const rangeEnd = offset + messages.length;
            currentRangeSpan.textContent = `${rangeStart} - ${rangeEnd}`;

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
                messagesList.innerHTML = '<div class="loading">Ei vielä merkintöjä. Ole ensimmäinen!</div>';
                return;
            }

            messagesList.innerHTML = messages.map(m => `
                <div class="message-item">
                    <div class="message-meta">
                        <div class="meta-row"><span class="meta-label">Nimi :</span> <span class="meta-value">${escapeHtml(m.name)}</span></div>
                        ${m.email ? `<div class="meta-row"><span class="meta-label">@ :</span> <span class="meta-value">${escapeHtml(m.email)}</span></div>` : ''}
                        ${m.horse ? `<div class="meta-row"><span class="meta-label">Ratsu :</span> <span class="meta-value">${escapeHtml(m.horse)}</span></div>` : ''}
                        ${m.lesson_type ? `<div class="meta-row"><span class="meta-label">Tunti :</span> <span class="meta-value">${escapeHtml(m.lesson_type)}</span></div>` : ''}
                        <div class="meta-row" style="margin-top: 15px;"><span class="meta-label">Tuntitarina :</span> <span class="meta-value">${escapeHtml(m.message)}</span></div>
                    </div>
                    <div class="message-date">${formatDate(m.created_at)}</div>
                </div>
            `).join('');

            if (offset > 0 || currentOffset > 0) {
                document.getElementById('messages-list').scrollIntoView({ behavior: 'smooth' });
            }

        } catch (err) {
            messagesList.innerHTML = '<div class="error-message">Virhe merkintöjen latauksessa.</div>';
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
