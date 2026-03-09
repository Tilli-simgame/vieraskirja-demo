export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // HELPER: SIGN TOKEN
        async function signToken(data) {
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(env.TURNSTILE_SECRET_KEY),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
            return btoa(String.fromCharCode(...new Uint8Array(signature)));
        }

        // HELPER: VERIFY TOKEN
        async function verifyToken(data, signature) {
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(env.TURNSTILE_SECRET_KEY),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['verify']
            );
            const sigBuf = new Uint8Array(atob(signature).split('').map(c => c.charCodeAt(0)));
            return await crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(data));
        }

        // GET MESSAGES BY ROOM
        if (url.pathname === '/api/chat' && request.method === 'GET') {
            try {
                const room = url.searchParams.get('room') || 'Talli';
                const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

                const { results } = await env.DB.prepare(
                    'SELECT id, name, message, created_at FROM chat_messages WHERE room = ? ORDER BY created_at DESC LIMIT ?'
                ).bind(room, limit).all();

                return new Response(JSON.stringify(results.reverse()), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
            }
        }

        // VERIFY TURNSTILE AND GIVE SESSION TOKEN
        if (url.pathname === '/api/chat/verify' && request.method === 'POST') {
            try {
                const data = await request.json();
                const token = data['cf-turnstile-response'];

                if (!token) return new Response(JSON.stringify({ error: 'Token missing' }), { status: 400, headers: corsHeaders });

                const formData = new FormData();
                formData.append('secret', env.TURNSTILE_SECRET_KEY);
                formData.append('response', token);

                const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                    method: 'POST',
                    body: formData,
                });

                const turnstileData = await turnstileRes.json();
                if (!turnstileData.success) {
                    return new Response(JSON.stringify({ error: 'Turnstile failed' }), { status: 400, headers: corsHeaders });
                }

                // Create a session token valid for 24h
                const timestamp = Date.now().toString();
                const signature = await signToken(timestamp);

                return new Response(JSON.stringify({ chatToken: `${timestamp}.${signature}` }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
            }
        }

        // POST NEW MESSAGE
        if (url.pathname === '/api/chat' && request.method === 'POST') {
            try {
                const data = await request.json();
                let isAuthorized = false;

                // Option 1: Signed chatToken
                if (data.chatToken) {
                    const [ts, sig] = data.chatToken.split('.');
                    if (ts && sig) {
                        const isValid = await verifyToken(ts, sig);
                        const isFresh = (Date.now() - parseInt(ts)) < (24 * 60 * 60 * 1000);
                        if (isValid && isFresh) isAuthorized = true;
                    }
                }

                // Option 2: Direct Turnstile (fallback)
                if (!isAuthorized && data['cf-turnstile-response']) {
                    const formData = new FormData();
                    formData.append('secret', env.TURNSTILE_SECRET_KEY);
                    formData.append('response', data['cf-turnstile-response']);
                    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: formData });
                    const resData = await res.json();
                    if (resData.success) isAuthorized = true;
                }

                if (!isAuthorized) {
                    return new Response(JSON.stringify({ error: 'Vahvistus epäonnistui. Ole hyvä ja lataa sivu uudelleen.' }), { status: 403, headers: corsHeaders });
                }

                // Message validation
                const room = data.room || 'Talli';
                const name = (data.name || 'Nimetön').substring(0, 50).trim();
                const message = (data.message || '').substring(0, 500).trim();

                if (!message) {
                    return new Response(JSON.stringify({ error: 'Viesti puuttuu' }), { status: 400, headers: corsHeaders });
                }

                await env.DB.prepare(
                    'INSERT INTO chat_messages (room, name, message) VALUES (?, ?, ?)'
                ).bind(room, name, message).run();

                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
            }
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
};
