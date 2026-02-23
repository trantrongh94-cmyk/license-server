require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =======================
// DATABASE CONNECTION
// =======================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// =======================
// TEST SERVER + DATABASE
// =======================

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "Server running",
      db_time: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// =======================
// CHECK LICENSE
// =======================

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

    const now = new Date();

if (license.status !== "active") {
  return res.json({ valid: false, message: "License not activated" });
}

if (new Date(license.expire_at) < now) {
  return res.json({ valid: false, message: "License expired" });
}

    res.json({
      valid: true,
      plan: license.plan,
      expire_at: license.expire_at,
      status: license.status,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// =======================
// CREATE LICENSE (BY DAYS)
// =======================

app.post("/create-license", async (req, res) => {
  try {
    const { days } = req.body;

    if (!days || ![7, 30, 180, 365].includes(days)) {
      return res.json({
        success: false,
        message: "Invalid days value (allowed: 7,30,180,365)"
      });
    }

    // Generate random license key
    const licenseKey =
      "LIC-" +
      Math.random().toString(36).substring(2, 8).toUpperCase() +
      "-" +
      Math.random().toString(36).substring(2, 8).toUpperCase();

    // Calculate expire date
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + days);

    await pool.query(
      `INSERT INTO licenses (license_key, plan, expire_at, status)
       VALUES ($1, $2, $3, $4)`,
      [licenseKey, "pro", expireDate, "inactive"]
    );

    res.json({
      success: true,
      license_key: licenseKey,
      expire_at: expireDate,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// =======================
// START SERVER
// =======================

app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});