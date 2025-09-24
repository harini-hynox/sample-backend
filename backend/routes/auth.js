// backend/routes/auth.js
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

// ✅ Public client (anon key) → for login/signup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ✅ Admin client (service role key) → only for admin tasks
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// -------------------- SIGNUP --------------------
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // ✅ Use Supabase Admin to create + auto-confirm user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      options: {
        email_confirm: true, // ✅ FIXED usage
      },
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.status(201).json({
      message: "Signup successful",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// -------------------- LOGIN --------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // ✅ Use normal Supabase client (anon) to login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const { user, session } = data;

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        ...user.user_metadata,
      },
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

module.exports = router;
