const fs = require("fs/promises");
const path = require("path");

/**
 * Inspects a directory to detect the programming language, framework, and entry point.
 * Supports: Go, Rust, Bun, PHP, Ruby, Java (Maven/Gradle), Python, Node.js, and Static HTML.
 */
async function detectBuildpack(targetDir) {
  const entries = await fs.readdir(targetDir).catch(() => []);
  const fileSet = new Set(entries.map((e) => e.toLowerCase()));

  // 1. Dockerfile (User provided)
  if (fileSet.has("dockerfile")) {
    return {
      language: "docker",
      framework: "dockerfile",
      title: "Custom Dockerfile",
      port: 3000,
    };
  }

  // 2. Go (go.mod or main.go)
  if (fileSet.has("go.mod") || fileSet.has("main.go")) {
    return {
      language: "go",
      framework: "go",
      title: "Go Application",
      port: 8080,
    };
  }

  // 3. Rust (Cargo.toml)
  if (fileSet.has("cargo.toml")) {
    return {
      language: "rust",
      framework: "rust",
      title: "Rust Application",
      port: 8080,
    };
  }

  // 4. Bun (bun.lockb or bun.lock)
  if (fileSet.has("bun.lockb") || fileSet.has("bun.lock")) {
    return {
      language: "bun",
      framework: "bun",
      title: "Bun Runtime",
      port: 3000,
    };
  }

  // 5. Java (pom.xml or build.gradle)
  if (fileSet.has("pom.xml")) {
    return {
      language: "java",
      framework: "maven",
      title: "Java (Maven)",
      port: 8080,
    };
  }
  if (fileSet.has("build.gradle") || fileSet.has("build.gradle.kts")) {
    return {
      language: "java",
      framework: "gradle",
      title: "Java (Gradle)",
      port: 8080,
    };
  }

  // 6. PHP (composer.json or index.php)
  if (fileSet.has("composer.json") || fileSet.has("index.php")) {
    return {
      language: "php",
      framework: "php",
      title: "PHP Application",
      port: 80,
    };
  }

  // 7. Ruby (Gemfile)
  if (fileSet.has("gemfile")) {
    return {
      language: "ruby",
      framework: "ruby",
      title: "Ruby Application",
      port: 3000,
    };
  }

  // 8. Python (requirements.txt, pyproject.toml, Pipfile)
  if (
    fileSet.has("requirements.txt") ||
    fileSet.has("pyproject.toml") ||
    fileSet.has("pipfile")
  ) {
    return {
      language: "python",
      framework: "python",
      title: "Python Application",
      port: 8000,
    };
  }

  // 9. Node.js (package.json)
  if (fileSet.has("package.json")) {
    return {
      language: "node",
      framework: "node",
      title: "Node.js Application",
      port: 3000,
    };
  }

  // 10. Static (index.html)
  if (fileSet.has("index.html")) {
    return {
      language: "static",
      framework: "static",
      title: "Static Website",
      port: 80,
    };
  }

  // Fallback to custom / generic
  return {
    language: "custom",
    framework: "custom",
    title: "Generic Application",
    port: 3000,
  };
}

module.exports = {
  detectBuildpack,
};

