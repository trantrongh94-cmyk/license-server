require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

console.log("DATABASE_URL:", process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/", async (req, res) => {
  app.get("/check", async (req, res) => {
    try {
      const { key } = req.query;
  
      if (!key) {
        return res.json({ valid: false, message: "Missing key" });
      }
  
      const result = await pool.query(
        "SELECT * FROM licenses WHERE license_key = $1",
        [key]
      );
  
      if (result.rows.length === 0) {
        return res.json({ valid: false, message: "License not found" });
      }
  
      const license = result.rows[0];
  
      // Kiểm tra hết hạn
      const now = new Date();
      if (new Date(license.expire_at) < now) {
        return res.json({ valid: false, message: "License expired" });
      }
  
      res.json({
        valid: true,
        plan: license.plan,
        expire_at: license.expire_at,
        status: license.status
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "Server running",
      db_time: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Database connection failed",
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});