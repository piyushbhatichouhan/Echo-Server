const docker = require("../docker/docker.client");
const axios = require("axios");
const { Resolver } = require("dns").promises;

let cachedOutboundIp = null;
let lastIpFetchTime = 0;
const IP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const isPublicIpv4 = (ip) =>
  typeof ip === "string" &&
  /^(?!0\.)(?!127\.)(?!10\.)(?!172\.(1[6-9]|2\d|3[01])\.)(?!192\.168\.)(\d{1,3}\.){3}\d{1,3}$/.test(
    ip.trim(),
  );

const isPublicIpv6 = (ip) => {
  if (typeof ip !== "string") return false;
  const s = ip.trim().toLowerCase();
  if (s === "::1" || s.startsWith("fe80") || s.startsWith("fc") || s.startsWith("fd")) return false;
  return s.includes(":") && s.length >= 3;
};

const isPublicIp = (ip) => isPublicIpv4(ip) || isPublicIpv6(ip);

const withTimeout = (promise, ms = 2500) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

const getDockerInfo = async () => {
  return await docker.info();
};

const HARDCODED_SERVER_IP = "103.82.99.186";

const getOutboundIp = async () => {
  if (process.env.SERVER_PUBLIC_IP && isPublicIp(process.env.SERVER_PUBLIC_IP)) {
    return process.env.SERVER_PUBLIC_IP.trim();
  }
  return HARDCODED_SERVER_IP;
};

const DATABASE_PRESETS = [
  {
    id: "mongodb",
    name: "MongoDB (Atlas / Self-Hosted)",
    icon: "🍃",
    defaultPort: 27017,
    providers: ["MongoDB Atlas", "Railway", "DigitalOcean", "Self-Hosted"],
    envVariables: [
      {
        key: "MONGODB_URI",
        example: "mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/myDatabase?retryWrites=true&w=majority",
        description: "Full MongoDB connection string. Replace username, password, and database name.",
        required: true,
      },
    ],
    whitelistInstruction: "In MongoDB Atlas: Go to Security -> Network Access -> '+ Add IP Address' -> Enter this Server Outbound IP with /32 (e.g. {{IP}}/32).",
    nodeSnippet: `const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;`,
    pythonSnippet: `from pymongo import MongoClient
import os

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()
print("MongoDB Connected:", db.name)`,
    gotchas: [
      "Inside Docker, 'localhost' points to the container itself. Use MongoDB Atlas or your remote database host.",
      "If your password has special characters (@, #, %, :), you must percent-encode them in the URI.",
      "Ensure your Atlas database user has the 'readWriteAnyDatabase' or specific DB readWrite privilege.",
    ],
  },
  {
    id: "postgresql",
    name: "PostgreSQL (Supabase / Neon / RDS)",
    icon: "🐘",
    defaultPort: 5432,
    providers: ["Supabase", "Neon", "AWS RDS", "Render", "Railway"],
    envVariables: [
      {
        key: "DATABASE_URL",
        example: "postgresql://postgres:<password>@db.xxx.supabase.co:5432/postgres?sslmode=require",
        description: "Postgres connection string. Ensure sslmode=require is included for cloud providers.",
        required: true,
      },
      {
        key: "PGSSLMODE",
        example: "require",
        description: "Forces SSL connections. Required by Neon and Supabase.",
        required: false,
      },
    ],
    whitelistInstruction: "In Supabase / Neon / AWS RDS: Under Network Settings / Security Groups, ensure inbound connections on port 5432 (or 6543 for PgBouncer) are allowed from this Server Outbound IP.",
    nodeSnippet: `const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Postgres connection error:', err);
  else console.log('Postgres Connected:', res.rows[0]);
});

module.exports = pool;`,
    pythonSnippet: `import os
import psycopg2

conn = psycopg2.connect(
    os.getenv("DATABASE_URL"),
    sslmode="require"
)
print("PostgreSQL Connected")`,
    gotchas: [
      "For Supabase, use port 6543 with transaction pooling (PgBouncer) for high concurrency.",
      "Always include '?sslmode=require' in cloud Postgres connection strings.",
      "If using Prisma, define 'DATABASE_URL' in Environment Variables and run 'npx prisma generate' in your build command.",
    ],
  },
  {
    id: "mysql",
    name: "MySQL / MariaDB (PlanetScale / RDS / Aiven)",
    icon: "🐬",
    defaultPort: 3306,
    providers: ["PlanetScale", "AWS RDS", "Aiven", "DigitalOcean"],
    envVariables: [
      {
        key: "DATABASE_URL",
        example: "mysql://user:<password>@host:3306/dbname?ssl=true",
        description: "Standard MySQL URI connection string.",
        required: true,
      },
      {
        key: "MYSQL_HOST",
        example: "db.myhost.com",
        description: "Alternative parameter-based configuration host.",
        required: false,
      },
      {
        key: "MYSQL_USER",
        example: "admin",
        description: "MySQL user name.",
        required: false,
      },
      {
        key: "MYSQL_PASSWORD",
        example: "your_strong_password",
        description: "MySQL user password.",
        required: false,
      },
      {
        key: "MYSQL_DATABASE",
        example: "production_db",
        description: "Target database name.",
        required: false,
      },
    ],
    whitelistInstruction: "In AWS RDS / Cloud Firewall: Add an Inbound Rule on port 3306 for this Server Outbound IP ({{IP}}/32). For user grants: GRANT ALL ON db.* TO 'user'@'%' IDENTIFIED BY 'pass';",
    nodeSnippet: `const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false },
});

pool.getConnection()
  .then((conn) => {
    console.log('MySQL Connected');
    conn.release();
  })
  .catch((err) => console.error('MySQL connection error:', err));

module.exports = pool;`,
    pythonSnippet: `import os
import pymysql

conn = pymysql.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DATABASE"),
    ssl={"rejectUnauthorized": False}
)
print("MySQL Connected")`,
    gotchas: [
      "Use 'mysql2' instead of 'mysql' in Node.js for Promise support and modern auth methods.",
      "Cloud MySQL providers (like PlanetScale) require SSL enabled on connections.",
      "Ensure MySQL user host is configured to '%' or your specific Outbound IP, not 'localhost'.",
    ],
  },
  {
    id: "redis",
    name: "Redis (Upstash / Redis Cloud / Aiven)",
    icon: "🔴",
    defaultPort: 6379,
    providers: ["Upstash (Serverless)", "Redis Cloud", "AWS ElastiCache", "Aiven"],
    envVariables: [
      {
        key: "REDIS_URL",
        example: "rediss://default:<password>@cluster.upstash.io:6379",
        description: "Redis connection URI. Note 'rediss://' (with double 's') enforces TLS encryption.",
        required: true,
      },
      {
        key: "REDIS_PASSWORD",
        example: "your_redis_token_or_password",
        description: "Redis auth token / password.",
        required: false,
      },
    ],
    whitelistInstruction: "In Redis Cloud or Upstash: In Security / IP Whitelist settings, add this Server Outbound IP ({{IP}}).",
    nodeSnippet: `const Redis = require('ioredis');

// Note: rediss:// protocol automatically enables TLS
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => console.log('Redis Connected Successfully'));
redis.on('error', (err) => console.error('Redis Error:', err.message));

module.exports = redis;`,
    pythonSnippet: `import os
import redis

# rediss:// enables SSL
r = redis.from_url(os.getenv("REDIS_URL"))
r.ping()
print("Redis Connected Successfully")`,
    gotchas: [
      "Always use 'rediss://' (two 's's) for managed Redis instances that require TLS/SSL.",
      "Configure maxRetriesPerRequest and retryStrategy in ioredis to prevent unhandled promise rejection crashes.",
      "If running background queue jobs (BullMQ / Celery), ensure the connection pool is separate from cache operations.",
    ],
  },
  {
    id: "firebase",
    name: "Firebase (Firestore / Auth / Realtime DB)",
    icon: "🔥",
    defaultPort: 443,
    providers: ["Google Firebase", "Google Cloud Platform"],
    envVariables: [
      {
        key: "FIREBASE_PROJECT_ID",
        example: "my-app-project-12345",
        description: "Your Firebase Project ID from Project Settings.",
        required: true,
      },
      {
        key: "FIREBASE_CLIENT_EMAIL",
        example: "firebase-adminsdk-xxx@my-app-project-12345.iam.gserviceaccount.com",
        description: "The service account email address.",
        required: true,
      },
      {
        key: "FIREBASE_PRIVATE_KEY",
        example: "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk...\\n-----END PRIVATE KEY-----\\n",
        description: "The private key from serviceAccountKey.json. Keep the \\n newline characters intact.",
        required: true,
      },
      {
        key: "FIREBASE_SERVICE_ACCOUNT",
        example: "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6Ii4uLiJ9",
        description: "Alternative: Base64-encoded or raw JSON of serviceAccountKey.json.",
        required: false,
      },
    ],
    whitelistInstruction: "Firebase Admin SDK connects over standard outbound HTTPS (port 443). If your Google Cloud project enforces VPC Service Controls or API restrictions, whitelist this Server Outbound IP.",
    nodeSnippet: `const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Supports individual env variables with newline fix
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\\\n/g, '\\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = admin.firestore();
console.log('Firebase Admin Initialized');
module.exports = { admin, db };`,
    pythonSnippet: `import os
import firebase_admin
from firebase_admin import credentials, firestore

private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\\\n", "\\n")

cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "private_key": private_key,
    "token_uri": "https://oauth2.googleapis.com/token"
})

firebase_admin.initialize_app(cred)
db = firestore.client()
print("Firebase Admin Initialized")`,
    gotchas: [
      "Never commit 'serviceAccountKey.json' to Git! Use environment variables instead.",
      "The private key contains literal newlines. In Node, always do: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\\n').",
      "Ensure the Firebase Admin SDK service account has Cloud Datastore User / Firebase Admin role in GCP IAM.",
    ],
  },
];

const getDeploymentGuide = async () => {
  const outboundIp = await getOutboundIp(false);

  // Populate dynamic IP into whitelist instructions
  const databases = DATABASE_PRESETS.map((db) => ({
    ...db,
    whitelistInstruction: db.whitelistInstruction.replace(/{{IP}}/g, outboundIp || "YOUR_SERVER_IP"),
  }));

  return {
    outboundIp,
    databases,
    goldenRules: [
      {
        id: "port",
        title: "Always Use process.env.PORT",
        desc: "EchoServer automatically assigns an internal port via process.env.PORT. Always bind to process.env.PORT || 3000 (Node) or os.environ.get('PORT', 8000) (Python).",
        code: "const PORT = process.env.PORT || 3000;\napp.listen(PORT, '0.0.0.0', () => console.log(`Listening on ${PORT}`));",
      },
      {
        id: "host",
        title: "Bind to 0.0.0.0 (Not 127.0.0.1)",
        desc: "Inside Docker containers, binding to 127.0.0.1 / localhost drops incoming reverse proxy traffic. Always bind to 0.0.0.0.",
        code: "app.listen(PORT, '0.0.0.0'); // Node.js\nuvicorn.run('main:app', host='0.0.0.0', port=PORT) # Python",
      },
      {
        id: "fullstack",
        title: "Full-Stack Single Port Serving",
        desc: "When deploying a monorepo with backend and frontend, build the frontend into 'dist' or 'build' and have your backend Express server serve those static files.",
        code: "app.use(express.static(path.join(__dirname, '../frontend/dist')));\napp.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));",
      },
      {
        id: "database",
        title: "Database Whitelisting & Connection Strings",
        desc: "Inside Docker, 'localhost' refers to the container itself. For cloud databases (MongoDB Atlas, Supabase, Neon, MySQL, Redis), whitelist this server's Outbound IP and configure connection strings in Environment Variables.",
        code: `Outbound IP to whitelist: ${outboundIp}`,
      },
    ],
    frameworks: [
      {
        name: "Node.js (Express / Fastify)",
        runtime: "node",
        install: "npm install",
        build: "",
        start: "node server.js",
        workingDir: ".",
        tip: "Ensure your package.json has a 'start' script, or your entry file is named server.js, app.js, or index.js.",
      },
      {
        name: "MERN / Full-Stack Monorepo",
        runtime: "node",
        install: "npm run install:all",
        build: "npm run build",
        start: "node backend/server.js",
        workingDir: ".",
        tip: "Define 'install:all': 'cd backend && npm install && cd ../frontend && npm install' and 'build': 'cd frontend && npm run build' in your root package.json.",
      },
      {
        name: "Static Web (React / Vite / Vue / SPA)",
        runtime: "static",
        install: "npm install",
        build: "npm run build",
        output: "dist",
        start: "None (Nginx auto-managed)",
        workingDir: ".",
        tip: "EchoServer serves built static files using high-performance Nginx with automatic SPA route fallbacks and Gzip compression.",
      },
      {
        name: "Python (FastAPI / Flask / Django)",
        runtime: "python",
        install: "pip install -r requirements.txt",
        build: "python manage.py collectstatic --noinput (Django only)",
        start: "uvicorn main:app --host 0.0.0.0 --port 8000",
        workingDir: ".",
        tip: "Ensure 'uvicorn', 'gunicorn', or 'flask' is listed in requirements.txt or pyproject.toml.",
      },
      {
        name: "Custom Dockerfile",
        runtime: "custom",
        install: "Defined in Dockerfile",
        build: "Defined in Dockerfile",
        start: "Defined in Dockerfile CMD",
        workingDir: ".",
        tip: "Ensure your Dockerfile specifies EXPOSE <port> so the platform can automatically route traffic to the right container port.",
      },
    ],
  };
};

module.exports = {
  getDockerInfo,
  getOutboundIp,
  getDeploymentGuide,
  DATABASE_PRESETS,
};
