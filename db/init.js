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

async function createSubredditsTable(){
    try{
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subreddits(
            id SERIAL PRIMARY KEY
            name SERIAL PRIMARY NOT NULL
            icon TEXT NOT NULL
            banner TEXT NOT NULL
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
            ;`
        );
        console.log("Subreddits Table Created")
    } catch(err){
        console.error("Unable to create subreddits table",err);
    }
}

async function createPostsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts(
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        subreddit_id INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        upvotes INTEGER DEFAULT 0,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_subreddit
          FOREIGN KEY(subreddit_id)
          REFERENCES subreddits(id)
          ON DELETE CASCADE
      );
    `);
    console.log("✅ posts table ready");
  } catch (err) {
    console.error("Failed to create posts table", err);
  }
}

async function initDB() {
  await createUsersTable();
  await createSubredditsTable();
  await createPostsTable();
}

module.exports = { initDB };