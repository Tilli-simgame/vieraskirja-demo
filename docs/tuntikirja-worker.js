/* Tuntikirja Worker routes — add these inside your existing fetch() handler in the guestbook worker,
   before the final 404 return statement.
   The tuntikirja table must first be created using tuntikirja-schema.sql. */

// HAE TUNTIKIRJA MERKINNÄT
if (url.pathname === '/api/tuntikirja' && request.method === 'GET') {
    try {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const { results } = await env.DB.prepare(
            'SELECT * FROM tuntikirja ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();

        const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM tuntikirja').first();
        const totalCount = countResult.total;

        return new Response(JSON.stringify(results), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'X-Total-Count': totalCount.toString()
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
}

// TALLENNA UUSI TUNTIKIRJA MERKINTÄ
if (url.pathname === '/api/tuntikirja' && request.method === 'POST') {
    try {
        const data = await request.json();

        // 1. Turnstile validointi
        const token = data['cf-turnstile-response'];
        if (!token) {
            return new Response(JSON.stringify({ error: 'Turnstile token missing' }), { status: 400, headers: corsHeaders });
        }

        const formData = new FormData();
        formData.append('secret', env.TURNSTILE_SECRET_KEY);
        formData.append('response', token);

        const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const turnstileData = await turnstileRes.json();
        if (!turnstileData.success) {
            return new Response(JSON.stringify({ error: 'Turnstile validation failed' }), { status: 400, headers: corsHeaders });
        }

        // 2. Kentät validointi ja tallennus
        const name = (data.name || '').substring(0, 100).trim();
        const horse = (data.horse || '').substring(0, 200).trim();
        const lesson_type = (data.lesson_type || '').substring(0, 100).trim();
        const message = (data.message || '').substring(0, 3000).trim();

        if (!name || !horse || !lesson_type || !message) {
            return new Response(JSON.stringify({ error: 'Pakollisia kenttiä puuttuu' }), { status: 400, headers: corsHeaders });
        }

        await env.DB.prepare(
            'INSERT INTO tuntikirja (name, email, horse, lesson_type, message) VALUES (?, ?, ?, ?, ?)'
        ).bind(
            name,
            (data.email || '').substring(0, 100).trim(),
            horse,
            lesson_type,
            message
        ).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
}
