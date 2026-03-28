const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.*, subreddits.name AS subreddit_name, users.username
      FROM posts
      JOIN subreddits ON posts.subreddit_id = subreddits.id
      LEFT JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts!" });
  }
});

router.post("/", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const { title, body, subredditId } = req.body;
    const userId = req.user.userId;

    if (!title || !body || !subredditId) {
      return res.status(400).json({ error: "title, body and subreddit are required" });
    }

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "post_images" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url;
    }

    const result = await pool.query(
      `INSERT INTO posts(title, body, subreddit_id, user_id, image)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, body, subredditId, userId, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const post = await pool.query(
      "SELECT user_id FROM posts WHERE id = $1", [id]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: "Post not found!" });
    }

    if (post.rows[0].user_id !== userId) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    await pool.query("DELETE FROM posts WHERE id = $1", [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete post!" });
  }
});

router.patch("/:id/vote", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;

  try {
    const result = await pool.query(
      "UPDATE posts SET upvotes = upvotes + $1 WHERE id = $2 RETURNING *",
      [delta, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to vote" });
  }
});

module.exports = router;