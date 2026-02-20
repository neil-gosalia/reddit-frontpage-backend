require("dotenv").config();

const express = require("express");
const cors = require("cors"); //lets frontend communicate w/ backend by not letting the browser block requests
const multer = require("multer");

const upload = multer({storage: multer.memoryStorage(),});
const cloudinary = require("cloudinary").v2;
const PORT = process.env.PORT || 3001;
const pool = require("./db")
const app = express(); //app now controls backend server by creating an Express app instance
cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
})
async function createPostsTable(){ // await creates a postgreSQL using Pool
    try{ 
        await pool.query(` 
            CREATE TABLE IF NOT EXISTS posts(
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            subreddit_id INTEGER NOT NULL,
            upvotes INTEGER DEFAULT 0,
            image TEXT,
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
            icon TEXT NOT NULL,
            banner TEXT NOT NULL,
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

app.get("/posts",async (req,res)=>{ //used to retrieve data; req=>data coming from frontend
    try{//res =>data being sent to frontend
        const result = await pool.query(`
            SELECT posts.*, subreddits.name
            FROM posts
            JOIN subreddits
            ON posts.subreddit_id = subreddits.id
            ORDER BY posts.created_at DESC            
        `);
        res.json(result.rows); //sends result back as JSON
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
app.post("/posts",async (req,res)=>{ //used to create new resources
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
            `, //RETURNING* returns inserted rows
            [title,body,subredditId]
        );
        res.status(201).json(result.rows[0]);
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Failed to fetch posts"})
    }
})
app.post("/subreddits",
    upload.fields([
        {name: "icon",maxCount: 1},
        {name: "banner",maxCount: 1},
    ]),
    async (req,res)=>{
        const {name} = req.body;
        if(!name){
            return res.status(400).json({error:"Subreddit Name Required"});
        }
        if(!req.files?.icon || !req.files?.banner){
            return res
                .status(400)
                .json({error: "Icon and banner are required!"})
        }
        const iconUpload = await new Promise((resolve,reject)=>{
            const stream = cloudinary.uploader.upload_stream(
                {folder: "subreddit_icons"},
                (error,result)=>{
                    if(error)reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.files.icon[0].buffer);
        })
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
        try{
            const result = await pool.query(
                `INSERT INTO subreddits (name,icon,banner)
                VALUES ($1,$2,$3)
                ON CONFLICT (name) DO NOTHING
                RETURNING *
                `,[name,iconUpload.secure_url,bannerUpload.secure_url]
            );
            if(result.rows.length === 0){
                return res.status(409).json({error: "Subreddit Already Exists"})
            }
            res.status(201).json(result.rows[0]);
        }catch(err){
            console.error(err);
            res.status(500).json({error:"failed to create subreddit"})
        }
})
app.get("/update-db", async (req, res) => {
  try {
    await pool.query(`ALTER TABLE posts ADD COLUMN image TEXT`);
    await pool.query(`
      ALTER TABLE subreddits 
      ADD COLUMN icon TEXT NOT NULL DEFAULT '',
      ADD COLUMN banner TEXT NOT NULL DEFAULT ''
    `);

    res.send("Tables Updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update tables");
  }
});
app.post("/upload",upload.single("image"), async (req,res)=>{
    try{
        if(!req.file){
            return res.status(400).json({error: "No file uploaded"})
        }
        const stream = cloudinary.uploader.upload_stream(
            {folder: "subreddit_assets"},
            (error,result)=>{
                if(error){
                    console.error(error);
                    return res.status(500).json({error: "Cloudinary upload failed."});
                }
                res.json({url: result.secure_url});
            }
        )
        stream.end(req.file.buffer);
    }catch(err){
        console.error(err);
        res.status(500).json({error: "Upload Failed"})
    }
});
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
