const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

// -------------------- SUPABASE --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role for server-side ops
);

// -------------------- AUTH MIDDLEWARE --------------------
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = user; // Supabase user object
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    return res
      .status(500)
      .json({ message: "Auth check failed", error: err.message });
  }
};

// -------------------- HEALTH CHECK --------------------
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Tasks API running 🚀" });
});

// -------------------- CREATE TASK --------------------
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          user_id: req.user.id,
          title,
          description,
          due_date: dueDate || null,
          priority: priority || "medium",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error("❌ Error creating task:", err.message);
    return res
      .status(500)
      .json({ message: "Error creating task", error: err.message });
  }
});

// -------------------- GET ALL TASKS --------------------
router.get("/", auth, async (req, res) => {
  try {
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (req.query.completed === "true") query = query.eq("completed", true);
    if (req.query.completed === "false") query = query.eq("completed", false);
    if (req.query.priority) query = query.eq("priority", req.query.priority);

    const { data, error } = await query;

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error("❌ Error fetching tasks:", err.message);
    return res
      .status(500)
      .json({ message: "Error fetching tasks", error: err.message });
  }
});

// -------------------- GET SINGLE TASK --------------------
router.get("/:id", auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error?.code === "PGRST116") {
      return res.status(404).json({ message: "Task not found" });
    }
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error("❌ Error fetching task:", err.message);
    return res
      .status(500)
      .json({ message: "Error fetching task", error: err.message });
  }
});

// -------------------- UPDATE TASK --------------------
router.put("/:id", auth, async (req, res) => {
  try {
    const allowedFields = [
      "title",
      "description",
      "completed",
      "due_date",
      "priority",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    updates.updated_at = new Date();

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error?.code === "PGRST116") {
      return res.status(404).json({ message: "Task not found" });
    }
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error("❌ Error updating task:", err.message);
    return res
      .status(500)
      .json({ message: "Error updating task", error: err.message });
  }
});

// -------------------- DELETE TASK --------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error?.code === "PGRST116") {
      return res.status(404).json({ message: "Task not found" });
    }
    if (error) throw error;

    return res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting task:", err.message);
    return res
      .status(500)
      .json({ message: "Error deleting task", error: err.message });
  }
});

module.exports = router;
