const express = require("express");
const cors = require("cors");
const app = express()
const PORT = 3001
let nextId = 2
app.use(express.json());
app.use(cors());
let posts = [{
    id: 1,
    title: "Welcome to the Reddit Clone",
    body: "This is the first post on the platform.",
    subreddit: "general",
    upvotes: 12,
    source: "user",
}]

app.get("/posts",(req,res)=>{
    res.json(posts)
})
app.post("/posts",(req,res)=>{
    const {title,body,subreddit,source} = req.body;
    if(!title || !body || !subreddit){
        return res.status(400).json({
            error: "title, body and subreddit are required",
        })
    }
    const newPost = {
        id: nextId++,
        title,
        body,
        subreddit,
        upvotes: 0,
        source: source || "user",
    }
    posts.push(newPost)
    res.status(201).json(newPost);
})
app.delete("/posts/:id",(req,res)=>{
    const id = Number(req.params.id);
    const initialLength = posts.length;
    posts = posts.filter(post=>post.id !==id);
    if(posts.length === initialLength){
        return res.status(404).json({error:"Post not found!"})
    }
    res.status(204).end();
})
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`)
})
