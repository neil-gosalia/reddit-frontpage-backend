require("dotenv").config();

const express = require("express");
const cors = require("cors"); //lets frontend communicate w/ backend by not letting the browser block requests
const { initDB } = reuire("./db/init")
const authRoutes = require("./routes/auth")
const postRoutes = require("./routes/posts")
const subredditRoutes = require("./routes/subreddits")
const app = express(); //app now controls backend server by creating an Express app instance
const PORT = process.env.PORT || 3001;


app.use(express.json());
app.use(cors());

app.use("/auth",authRoutes)
app.use("/posts",postRoutes)
app.use("/subreddits",subredditRoutes)

initDB();
app.listen(PORT,()=>{console.log(`Server running on port ${PORT}`)})
