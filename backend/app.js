const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://mongodb:27017/linkshortener";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let db;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Generate random short code
function generateShortCode(length = 6) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// API Routes

// POST /api/shorten - Create short URL
app.post("/api/shorten", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Check if URL already exists
    const existingUrl = await db
      .collection("urls")
      .findOne({ originalUrl: url });
    if (existingUrl) {
      return res.json({
        shortCode: existingUrl.shortCode,
        originalUrl: existingUrl.originalUrl,
        createdAt: existingUrl.createdAt,
      });
    }

    // Generate unique short code
    let shortCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      shortCode = generateShortCode();
      const existing = await db.collection("urls").findOne({ shortCode });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res
        .status(500)
        .json({ error: "Unable to generate unique short code" });
    }

    // Save to database
    const urlDoc = {
      shortCode,
      originalUrl: url,
      createdAt: new Date(),
      clicks: 0,
    };

    await db.collection("urls").insertOne(urlDoc);

    res.json({
      shortCode: urlDoc.shortCode,
      originalUrl: urlDoc.originalUrl,
      createdAt: urlDoc.createdAt,
    });
  } catch (error) {
    console.error("Error creating short URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/recent - Get recent URLs
app.get("/api/recent", async (req, res) => {
  try {
    const recentUrls = await db
      .collection("urls")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    res.json(recentUrls);
  } catch (error) {
    console.error("Error fetching recent URLs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/stats/:shortCode - Get URL statistics
app.get("/api/stats/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;

    const urlDoc = await db.collection("urls").findOne({ shortCode });

    if (!urlDoc) {
      return res.status(404).json({ error: "Short URL not found" });
    }

    res.json({
      shortCode: urlDoc.shortCode,
      originalUrl: urlDoc.originalUrl,
      createdAt: urlDoc.createdAt,
      clicks: urlDoc.clicks,
    });
  } catch (error) {
    console.error("Error fetching URL stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /:shortCode - Redirect to original URL
app.get("/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Skip API routes and static files
    if (shortCode.startsWith("api") || shortCode.includes(".")) {
      return res.status(404).json({ error: "Not found" });
    }

    const urlDoc = await db.collection("urls").findOne({ shortCode });

    if (!urlDoc) {
      return res.status(404).json({ error: "Short URL not found" });
    }

    // Increment click count
    await db
      .collection("urls")
      .updateOne({ shortCode }, { $inc: { clicks: 1 } });

    // Redirect to original URL
    res.redirect(301, urlDoc.originalUrl);
  } catch (error) {
    console.error("Error redirecting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

startServer().catch(console.error);
