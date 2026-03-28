const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jwt")
const pool = require("../db")

router.post("/register",async(req,res)=>{
    const {username,email,password} = req.body;
    if(!username||!email||!password){
        return res.status(400).json({error:"All fields are mandatory"})
    }
    try{
        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1 or username =$2",[email,username]
        );
        if(existing.rows.length > 0){
            return res.status(409).json({error:"Email or username already taken"})
        }
        const hashedPassword = await bcrypt.hash(password,10);
        const result = await pool.query(
            `INSERT INTO users (username,email,password)
            VALUES ($1,$2,$3)
            RETURNING id,username,email`,
            [username,email,password]
        )
        const user = result.rows[0];
        const token = jwt.sign(
            {userId: user.id, email: user.email, username: user.username},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        );
        res.status(201).json({token, user});
    } catch(err){
        console.error("Registered User:", err);
        res.status(500).json({error:"Failed to register"});
    }
})

router.post("/login",async (req,res)=>{
    const {email,password} = req.body;
    if(!email||!password){
        return res.status(400).json({error: "Email and Password are required"})
    }
    try{
        const result = await pool.query(
            "SELECT * FROM users WHERE email=$1",[email])
        if(result.rows.length===0){
            return res.status(401).json({error:"Invalid email or password"})
        }
        const user = result.rows[0];
        const match = await bcrpyt.compare(password,user.password)
        if(!match){
            return res.status(401).json({error:"Invalid email or password"})
        }
        const token = jwt.sign(
            { userId: user.id, email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.json({
            token,
            user: {id: user.id, username: user.username, email: user.email}
        });
    } catch(err){
        console.error("Login Error: ",err)
        res.status(500).json({ error: "Failed to Login"})
    }
});

module.exports = router;