// backend/middleware/supabaseAuth.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAuth = async (req, res, next) => {
  try {
    // ✅ Extract bearer token
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // ✅ Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.error("Supabase auth error:", error?.message || "No user found");
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // ✅ Attach the actual user object
    req.user = data.user; // contains { id, email, role, ... }
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(500).json({ message: "Authentication failed" });
  }
};

module.exports = supabaseAuth;
