const docker = require("../docker/docker.client");
const axios = require("axios");

let cachedOutboundIp = null;
let lastIpFetchTime = 0;
const IP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const getDockerInfo = async () => {
  return await docker.info();
};

const getOutboundIp = async () => {
  if (process.env.SERVER_PUBLIC_IP) {
    return process.env.SERVER_PUBLIC_IP.trim();
  }

  const now = Date.now();
  if (cachedOutboundIp && now - lastIpFetchTime < IP_CACHE_TTL_MS) {
    return cachedOutboundIp;
  }

  try {
    const res = await axios.get("https://api.ipify.org?format=json", {
      timeout: 2000,
    });
    if (res.data?.ip) {
      cachedOutboundIp = res.data.ip;
      lastIpFetchTime = now;
      return cachedOutboundIp;
    }
  } catch {}

  try {
    const res = await axios.get("https://ifconfig.me/ip", {
      timeout: 2000,
    });
    if (res.data && typeof res.data === "string") {
      cachedOutboundIp = res.data.trim();
      lastIpFetchTime = now;
      return cachedOutboundIp;
    }
  } catch {}

  return cachedOutboundIp || "127.0.0.1";
};

const getDeploymentGuide = async () => {
  const outboundIp = await getOutboundIp();

  return {
    outboundIp,
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
        desc: "Inside Docker, 'localhost' refers to the container itself. For cloud databases (MongoDB Atlas, Supabase, Neon), whitelist this server's Outbound IP and configure connection strings in Environment Variables.",
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
};
