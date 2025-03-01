const Redis = require("ioredis");
require("dotenv").config();

const client = new Redis(process.env.REDIS_URL, {
    tls: { rejectUnauthorized: false } // Required for Render/Upstash
});

client.on("connect", () => console.log("✅ Connected to Redis"));
client.on("error", (err) => console.error("❌ Redis Error:", err));

module.exports = client;
