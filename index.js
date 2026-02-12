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
            subreddit TEXT NOT NULL,
            upvotes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
createSubredditsTable();
createPostsTable();
app.use(express.json());
app.use(cors());

app.get("/posts",async (req,res)=>{
    try{
        const result = await pool.query(
            "SELECT * FROM posts ORDER BY created_at DESC"
        );
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
app.post("/posts",async (req,res)=>{
    const {title,body,subreddit} = req.body;
    if(!title || !body || !subreddit){
        return res.status(400).json({
            error: "title, body and subreddit are required",
        });
    }
    try {
        const result = await pool.query(
            `
            INSERT INTO posts(title,body,subreddit)
            VALUES ($1, $2, $3)
            RETURNING*
            `,
            [title,body,subreddit]
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
    const id = Number(req.params.id);
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
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`)
})
