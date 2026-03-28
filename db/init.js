const pool = require("../db")

async function createUsersTable(){
    try{
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
             id SERIAL PRIMARY KEY
             username TEXT UNIQUE NOT NULL
             email TEXT YNIQUE NOT NULL
             password TEXT UNIQUE NOT NULL
             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Users Table Ready")
    } catch(err) {
        console.error("Failed to create users table",err)
    }
}