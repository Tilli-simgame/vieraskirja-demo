        export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Credentials": "true"
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // HELPER: Get session from cookie
        const getSession = (request) => {
            const cookie = request.headers.get("Cookie") || "";
            const match = cookie.match(/session=([^;]+)/);
            if (!match) return null;
            try {
                const session = JSON.parse(atob(match[1]));
                if (Date.now() > session.exp) return null;
                return session;
            } catch (e) {
                return null;
            }
        };

        // HELPER: Is user allowed?
        const isAllowed = (username, env) => {
            const allowed = (env.ALLOWED_GITHUB_USERS || "").split(",").map(u => u.trim().toLowerCase());
            return allowed.includes(username.toLowerCase());
        };

        // --- AUTH ROUTES ---

        // GET /api/admin/auth/github -> Redirect to GitHub
        if (url.pathname === "/api/admin/auth/github" && request.method === "GET") {
            const githubUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(url.origin + '/api/admin/auth/github/callback')}&scope=user:email`;
            return Response.redirect(githubUrl);
        }

        // GET /api/admin/auth/github/callback -> Finalize login
        if (url.pathname === "/api/admin/auth/github/callback" && request.method === "GET") {
            try {
                const code = url.searchParams.get("code");
                if (!code) throw new Error("No code provided");

                // Exchange code for token
                const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({
                        client_id: env.GITHUB_CLIENT_ID,
                        client_secret: env.GITHUB_CLIENT_SECRET,
                        code
                    })
                });
                const tokenData = await tokenResponse.json();
                if (tokenData.error) throw new Error(tokenData.error_description);

                // Get user info
                const userResponse = await fetch("https://api.github.com/user", {
                    headers: {
                        "Authorization": `token ${tokenData.access_token}`,
                        "User-Agent": "Cloudflare-Worker"
                    }
                });
                const userData = await userResponse.json();

                if (!isAllowed(userData.login, env)) {
                    return new Response("Access Denied", { status: 403 });
                }

                // Create session
                const session = {
                    user: userData.login,
                    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                };
                const sessionStr = btoa(JSON.stringify(session));

                return new Response(null, {
                    status: 302,
                    headers: {
                        "Location": "/vieraskirja-demo/admin/",
                        "Set-Cookie": `session=${sessionStr}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
                    }
                });
            } catch (err) {
                return new Response(`Auth Error: ${err.message}`, { status: 500 });
            }
        }

        // --- ADMIN API ROUTES (Protected) ---

        if (url.pathname.startsWith("/api/admin/")) {
            const session = getSession(request);
            if (!session) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { 
                    status: 401, 
                    headers: { ...corsHeaders, "Content-Type": "application/json" } 
                });
            }

            // GET /api/admin/messages -> Fetch all
            if (url.pathname === "/api/admin/messages" && request.method === "GET") {
                try {
                    const { results } = await env.DB.prepare("SELECT * FROM messages ORDER BY created_at DESC").all();
                    return new Response(JSON.stringify(results), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (err) {
                    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
                }
            }

            // PATCH /api/admin/messages/:id -> Edit or Reply
            if (url.pathname.startsWith("/api/admin/messages/") && request.method === "PATCH") {
                const id = url.pathname.split("/").pop();
                try {
                    const data = await request.json();
                    await env.DB.prepare(
                        "UPDATE messages SET name = ?, message = ?, admin_reply = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                    ).bind(data.name, data.message, data.admin_reply || null, id).run();
                    
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (err) {
                    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
                }
            }

            // DELETE /api/admin/messages/:id -> Remove
            if (url.pathname.startsWith("/api/admin/messages/") && request.method === "DELETE") {
                const id = url.pathname.split("/").pop();
                try {
                    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (err) {
                    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
                }
            }

            // GET /api/admin/me -> Check status
            if (url.pathname === "/api/admin/me" && request.method === "GET") {
                return new Response(JSON.stringify({ user: session.user }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
            
            // POST /api/admin/logout
            if (url.pathname === "/api/admin/logout" && request.method === "POST") {
                return new Response(JSON.stringify({ success: true }), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "Set-Cookie": "session=; Path=/; HttpOnly; Max-Age=0"
                    }
                });
            }
        }

        // --- PUBLIC API ROUTES ---

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
