const PRESETS = {
  node: {
    runtime: "node",
    displayName: "Node.js",
    description: "Express, Fastify, NestJS, and Node servers.",
    icon: "server",
    working_directory: ".",
    install_command: "npm install",
    build_command: "npm run build",
    start_command: "npm start",
    output_directory: ".",
    port: 3000,
  },

  next: {
    runtime: "node",
    displayName: "Next.js",
    description: "Next.js SSR and full-stack applications.",
    icon: "server",
    working_directory: ".",
    install_command: "npm install",
    build_command: "npm run build",
    start_command: "npm start",
    output_directory: ".next",
    port: 3000,
  },

  vite: {
    runtime: "static",
    displayName: "Vite (React / Vue)",
    description: "Fast Single Page Application with Nginx routing.",
    icon: "globe",
    working_directory: ".",
    install_command: "npm install",
    build_command: "npm run build",
    start_command: "",
    output_directory: "dist",
    port: 80,
  },

  static: {
    runtime: "static",
    displayName: "Static Website",
    description: "HTML, CSS, JS, Vite, React build output.",
    icon: "globe",
    working_directory: ".",
    install_command: "npm install",
    build_command: "npm run build",
    start_command: "",
    output_directory: "dist",
    port: 80,
  },

  python: {
    runtime: "python",
    displayName: "Python",
    description: "Flask, FastAPI, Django, and Python web applications.",
    icon: "scroll",
    working_directory: ".",
    install_command: "pip install -r requirements.txt",
    build_command: "",
    start_command: "python app.py",
    output_directory: ".",
    port: 8000,
  },

  custom: {
    runtime: "custom",
    displayName: "Custom Docker",
    description: "Configure runtime and commands manually via Dockerfile.",
    icon: "box",
    working_directory: ".",
    install_command: "",
    build_command: "",
    start_command: "",
    output_directory: ".",
    port: 3000,
  },
};

const getRuntimePreset = (type) => {
  return PRESETS[type] || PRESETS.custom;
};

module.exports = {
  PRESETS,
  getRuntimePreset,
};
