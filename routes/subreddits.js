const express = require("express")
const router = express.Router()
const multer = require("multer")
const cloudinary = require("cloudinary").v2
const pool = require("../db")
const verifyToken = require("../middleware/verifyToken")

const upload = multer({storage:multer.memoryStorage()})

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM subreddits ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subreddits!" });
  }
});

router.post("/", verifyToken, upload.fields([
  { name: "icon", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]), async (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "Subreddit Name Required" });
  if (!req.files?.icon || !req.files?.banner) {
    return res.status(400).json({ error: "Icon and banner are required!" });
  }

  try {
    const iconUpload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "subreddit_icons" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.files.icon[0].buffer);
    });

    const bannerUpload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "subreddit_banners" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.files.banner[0].buffer);
    });

    const result = await pool.query(
      `INSERT INTO subreddits (name, icon, banner)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING *`,
      [name, iconUpload.secure_url, bannerUpload.secure_url]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: "Subreddit Already Exists" });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create subreddit" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM subreddits WHERE id = $1", [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Subreddit not found!" });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete subreddit!" });
  }
});

module.exports = router;
