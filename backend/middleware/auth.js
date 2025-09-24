const { createClient } = require("@supabase/supabase-js");

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to protect routes using Supabase JWT
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return res.status(401).json({ message: "Invalid or expired token" });

    req.user = user; // user.id is the Supabase user ID
    next();
  } catch (err) {
    console.error("Supabase auth error:", err.message);
    res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = { auth, supabase };
