---
layout: default
title: Tallichat - Lehmuskartanon Ratsastuskoulu
theme: muuta
---

<link rel="stylesheet" href="{{ '/assets/css/chat.css' | relative_url }}">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="chat-container">
    <div class="chat-header">
        <h1>Tallichat</h1>
    </div>

    <!-- Gatekeeper -->
    <div id="chat-gatekeeper" class="chat-gatekeeper">
        <div class="gatekeeper-title">Tervetuloa chattiin!</div>
        <p>Vahvista, että et ole botti päästäksesi sisään.</p>
        <div style="margin: 20px 0;">
            <div class="cf-turnstile" data-sitekey="0x4AAAAAACoXr7YFfmmnlCc0" data-callback="onTurnstileSuccess"></div>
        </div>
        <div id="verify-status" style="color: #8b4513; font-size: 0.9em;"></div>
    </div>

    <!-- Chat Content -->
    <div id="chat-content" class="chat-content-hidden">
        <div class="chat-tabs" id="chat-tabs">
            <div class="chat-tab active" data-room="Talli">Talli</div>
            <div class="chat-tab" data-room="Päärakennus">Päärakennus</div>
            <div class="chat-tab" data-room="Maneesi">Maneesi</div>
            <div class="chat-tab" data-room="Ulkokenttä">Ulkokenttä</div>
        </div>

        <div class="chat-window" id="chat-window">
            <div class="chat-message"><div class="msg-text">Ladataan viestejä...</div></div>
        </div>

        <div class="chat-status" id="chat-status">Päivitetään...</div>

        <form class="chat-form" id="chat-form">
            <div class="form-row">
                <input type="text" id="chat-name" class="chat-input input-name" placeholder="Nimimerkkisi" maxlength="50" required>
                <input type="text" id="chat-msg" class="chat-input input-msg" placeholder="Kirjoita viesti tähän..." maxlength="500" required>
                <button type="submit" class="chat-submit" id="chat-send">Lähetä</button>
            </div>
        </form>
    </div>
</div>

<script>
    const CHAT_API = 'https://chat.anniina-sipria.workers.dev/api/chat';
    let currentRoom = 'Talli';
    let lastMessageId = 0;
    let pollInterval;
    let chatSessionToken = sessionStorage.getItem('chatSessionToken');

    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const chatTabs = document.getElementById('chat-tabs');
    const chatStatus = document.getElementById('chat-status');
    const gatekeeper = document.getElementById('chat-gatekeeper');
    const chatContent = document.getElementById('chat-content');

    // Callback when Turnstile is solved
    window.onTurnstileSuccess = async function(token) {
        const verifyStatus = document.getElementById('verify-status');
        verifyStatus.textContent = 'Varmistetaan...';
        
        try {
            const res = await fetch(`${CHAT_API}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'cf-turnstile-response': token })
            });
            const data = await res.json();
            
            if (data.chatToken) {
                chatSessionToken = data.chatToken;
                sessionStorage.setItem('chatSessionToken', chatSessionToken);
                enterChat();
            } else {
                verifyStatus.textContent = 'Varmistus epäonnistui: ' + (data.error || 'Tuntematon virhe');
                if (window.turnstile) turnstile.reset();
            }
        } catch (err) {
            verifyStatus.textContent = 'Yhteysvirhe.';
            if (window.turnstile) turnstile.reset();
        }
    };

    function enterChat() {
        gatekeeper.style.display = 'none';
        chatContent.classList.remove('chat-content-hidden');
        fetchMessages();
        pollInterval = setInterval(fetchMessages, 10000);
    }

    // Room switching
    chatTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-tab')) {
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentRoom = e.target.dataset.room;
            lastMessageId = 0; 
            chatWindow.innerHTML = '<div class="chat-message"><div class="msg-text">Ladataan huonetta...</div></div>';
            fetchMessages();
        }
    });

    async function fetchMessages() {
        try {
            chatStatus.textContent = 'Päivitetään...';
            const response = await fetch(`${CHAT_API}?room=${encodeURIComponent(currentRoom)}&limit=50`);
            if (!response.ok) throw new Error('Haku epäonnistui');
            
            const messages = await response.json();
            
            if (messages.length === 0) {
                chatWindow.innerHTML = '<div class="chat-message"><div class="msg-text">Ei vielä viestejä tässä huoneessa.</div></div>';
                chatStatus.textContent = 'Päivitetty (tyhjä)';
                return;
            }

            const newLastId = messages[messages.length - 1].id;
            if (newLastId === lastMessageId && lastMessageId !== 0) {
                chatStatus.textContent = 'Päivitetty: Ei uusia viestejä';
                return;
            }

            chatWindow.innerHTML = messages.map(m => `
                <div class="chat-message">
                    <div class="msg-meta">
                        <span class="msg-author">${escapeHtml(m.name)}</span>
                        <span class="msg-time">${formatTime(m.created_at)}</span>
                    </div>
                    <div class="msg-text">${escapeHtml(m.message)}</div>
                </div>
            `).join('');

            chatWindow.scrollTop = chatWindow.scrollHeight;
            lastMessageId = newLastId;
            chatStatus.textContent = 'Viimeksi päivitetty: ' + new Date().toLocaleTimeString();

        } catch (err) {
            console.error(err);
            chatStatus.textContent = 'Virhe viestien haussa.';
        }
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sendBtn = document.getElementById('chat-send');
        const name = document.getElementById('chat-name').value;
        const message = document.getElementById('chat-msg').value;

        if (!chatSessionToken) {
            alert('Varmistus puuttuu. Lataa sivu uudelleen.');
            location.reload();
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = '...';

        try {
            const res = await fetch(CHAT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room: currentRoom,
                    name: name,
                    message: message,
                    chatToken: chatSessionToken
                })
            });

            const result = await res.json();
            if (result.success) {
                document.getElementById('chat-msg').value = '';
                await fetchMessages();
            } else {
                if (res.status === 403) {
                    alert('Sessio vanhentunut. Varmistetaan uudelleen...');
                    sessionStorage.removeItem('chatSessionToken');
                    location.reload();
                } else {
                    alert('Virhe: ' + result.error);
                }
            }
        } catch (err) {
            alert('Lähetys epäonnistui.');
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Lähetä';
        }
    });

    function formatTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'});
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Check if we already have a session
    if (chatSessionToken) {
        enterChat();
    }
</script>
