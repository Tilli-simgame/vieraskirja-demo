export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // GET: Fetch messages
        if (url.pathname === "/api/guestbook" && request.method === "GET") {
            const limit = parseInt(url.searchParams.get("limit")) || 10;
            const offset = parseInt(url.searchParams.get("offset")) || 0;

            try {
                const { results } = await env.DB.prepare(
                    "SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?"
                ).bind(limit, offset).all();

                const countResult = await env.DB.prepare("SELECT COUNT(*) as total FROM messages").first();
                const total = countResult ? countResult.total : 0;

                return new Response(JSON.stringify(results), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "X-Total-Count": total.toString()
                    },
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        // POST: Add new message
        if (url.pathname === "/api/guestbook" && request.method === "POST") {
            try {
                const data = await request.json();
                
                if (!data.name || !data.message) {
                    return new Response(JSON.stringify({ error: "Name and message are required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // Turnstile Verification
                const turnstileToken = data['cf-turnstile-response'];
                if (!turnstileToken) {
                    return new Response(JSON.stringify({ error: "Spam verification missing" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
                const verification = await fetch(verifyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `secret=${encodeURIComponent(env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(turnstileToken)}`
                });

                const verificationResult = await verification.json();
                if (!verificationResult.success) {
                    return new Response(JSON.stringify({ error: "Spam verification failed", details: verificationResult['error-codes'] }), {
                        status: 403,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                await env.DB.prepare(
                    "INSERT INTO messages (name, email, website, url, rating, message) VALUES (?, ?, ?, ?, ?, ?)"
                ).bind(
                    data.name, 
                    data.email || null, 
                    data.website || null, 
                    data.url || null, 
                    data.rating || null, 
                    data.message
                ).run();

                return new Response(JSON.stringify({ success: true }), {
                    status: 201,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
};
