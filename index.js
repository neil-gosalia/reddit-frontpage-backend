const express = require("express");
const cors = require("cors");
const app = express()
const PORT = process.env.PORT || 3001;
const pool = require("./db")
async function createPostsTable(){
    try{
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts(
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            subreddit_id INTEGER NOT NULL,
            upvotes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_subreddit
                FOREIGN KEY(subreddit_id)
                REFERENCES subreddits(id)
                ON DELETE CASCADE
            );
        `)
        console.log("posts are made visible");
    } catch(err){
        console.error("failed to create posts");
    }
};
async function createSubredditsTable(){
    try{
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subreddits(
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`
        );
        console.log("✅ subreddits table is ready");
    }catch(err){
        console.log("Failed to load subreddits",err);
    }
}
async function initDB() {
  await createSubredditsTable();
  await createPostsTable();
}

initDB();
app.use(express.json());
app.use(cors());

app.get("/posts",async (req,res)=>{
    try{
        const result = await pool.query(`
            SELECT posts.*, subreddits.name
            FROM posts
            JOIN subreddits
            ON posts.subreddit_id = subreddits.id
            ORDER BY posts.created_at DESC            
        `);
        res.json(result.rows);
    } catch(err){
        console.error(err)
        res.status(500).json({error: "Failed to fetch posts!"});
    }
})
app.get("/subreddits",async(req,res)=>{
    try{
        const result = await pool.query(
            "SELECT * FROM subreddits ORDER BY created_at DESC"
        );
        res.json(result.rows)
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Failed to fetch subreddits!"})
    }
})
app.get("/reset-db", async (req, res) => {
  try {
    await pool.query("DROP TABLE IF EXISTS posts CASCADE;");
    await pool.query("DROP TABLE IF EXISTS subreddits CASCADE;");
    res.json({ message: "Tables dropped successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to drop tables" });
  }
});
app.post("/posts",async (req,res)=>{
    const {title,body,subredditId} = req.body;
    if(!title || !body || !subredditId){
        return res.status(400).json({
            error: "title, body and subreddit are required",
        });
    }
    try {
        const result = await pool.query(
            `
            INSERT INTO posts(title,body,subreddit_id)
            VALUES ($1, $2, $3)
            RETURNING*
            `,
            [title,body,subredditId]
        );
        res.status(201).json(result.rows[0]);
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Failed to fetch posts"})
    }
})
app.post("/subreddits", async (req,res)=>{
    const {name} = req.body;
    if(!name){
        return res.status(400).json({error:"subreddit not found"});
    }
    try{
        const result = await pool.query(
            `INSERT INTO subreddits (name)
            VALUES ($1)
            ON CONFLICT (name) DO NOTHING
            RETURNING *
            `,[name]
        );
        if(result.row.length === 0){
            return res.status(409).json({error: "subreddit already exists"})
        }
        res.status(201).json(result.rows[0]);
    }catch(err){
        console.error(err);
        res.status(500).json({error:"failed to create subreddit"})
    }
})
app.delete("/posts/:id",async (req,res)=>{
    const {id} = req.params;
    try{
        const result = await pool.query(
            "DELETE FROM posts WHERE id = $1",[id]
        );
        if(result.rowCount===0){
            return res.status(404).json({error: "Post not found!"});
        } res.status(204).end();
        }catch (err){
            console.error(err);
            res.status(500).json({error: "Failed to delete posts!"})
        }
});
app.delete("/subreddits/:id", async (req,res)=>{
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM subreddits WHERE id = $1",
      [id]
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
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`)
})
