// backend/routes/Avatar.js
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const supabaseAuth = require("../middleware/supabaseAuth.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ Ensure profile row exists
const ensureProfile = async (userId, email) => {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    const { error: insertError } = await supabase
      .from("profiles")
      .insert([{ id: userId, email }]);

    if (insertError) {
      console.error("Profile creation error:", insertError.message);
      throw insertError;
    }
  }
};

// ✅ Helper: fetch latest profile with cache-buster on avatar_url
const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, location, social, bio, avatar_url")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return {
    ...data,
    avatar_url: data.avatar_url
      ? `${data.avatar_url}?t=${Date.now()}` // 🔑 cache-buster
      : null,
  };
};

// ✅ Upload avatar
router.post(
  "/upload",
  supabaseAuth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const email = req.user.email;

      await ensureProfile(userId, email);

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileExt = file.originalname.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      // ✅ Always return fresh profile with cache-buster
      const updatedProfile = await getProfile(userId);

      return res.json({ profile: updatedProfile });
    } catch (err) {
      console.error("Avatar upload error:", err.message);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  }
);

// ✅ Fetch profile
router.get("/profile", supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    await ensureProfile(userId, email);
    const profile = await getProfile(userId);

    return res.json({ profile });
  } catch (err) {
    console.error("Profile fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ✅ Update profile
router.put("/profile", supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const { username, location, social, bio } = req.body;

    await ensureProfile(userId, email);

    const { error } = await supabase
      .from("profiles")
      .update({ username, location, social, bio })
      .eq("id", userId);

    if (error) {
      console.error("Profile update error:", error.message);
      return res.status(500).json({ error: "Failed to update profile" });
    }

    // ✅ Always return fresh profile with cache-buster
    const updatedProfile = await getProfile(userId);

    return res.json({ profile: updatedProfile });
  } catch (err) {
    console.error("Profile update error:", err.message);
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});

module.exports = router;
