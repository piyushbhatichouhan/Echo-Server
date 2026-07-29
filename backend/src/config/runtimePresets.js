const PRESETS = {
  node: {
    runtime: "node",
    displayName: "Node.js",
    description: "Express, Fastify, NestJS applications.",
    icon: "server",
    working_directory: ".",
    install_command: "npm install",
    build_command: "npm run build",
    start_command: "npm start",
    output_directory: ".",
    port: 3000,
  },

  static: {
    runtime: "static",
    displayName: "Static Website",

    description: "HTML, CSS, JS, Vite, React build output.",

    icon: "globe",
    working_directory: ".",

    install_command: "",

    build_command: "",

    start_command: "",

    output_directory: ".",

    port: 80,
  },

  python: {
    runtime: "python",
    displayName: "Python",

    description: "Flask, FastAPI, Django and Python web applications.",

    icon: "Scroll",
    working_directory: ".",

    install_command: "pip install -r requirements.txt",

    build_command: "",

    start_command: "python app.py",

    output_directory: ".",

    port: 5000,
  },

  custom: {
    runtime: "custom",
    displayName: "Docker",

    description: "Configure runtime and commands manually.",

    icon: "boat",
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
