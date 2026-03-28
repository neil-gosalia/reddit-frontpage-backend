require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const { initDB } = require("./db/init");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const subredditRoutes = require("./routes/subreddits");

const app = express();
const PORT = process.env.PORT || 3001;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(express.json());
app.use(cors());

app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/subreddits", subredditRoutes);

initDB();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));