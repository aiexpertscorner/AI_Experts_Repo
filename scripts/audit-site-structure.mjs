import fs from "fs";
import path from "path";

const root = process.cwd();

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      filelist = walk(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  });

  return filelist;
}

function printSection(title) {
  console.log("\n===============================");
  console.log(title);
  console.log("===============================\n");
}

function analyzePages() {
  const pagesDir = path.join(root, "src/pages");

  if (!fs.existsSync(pagesDir)) {
    console.log("No src/pages directory found.");
    return;
  }

  printSection("PAGE STRUCTURE");

  const files = walk(pagesDir);

  files.forEach(file => {
    if (file.endsWith(".astro") || file.endsWith(".md")) {
      const route = file
        .replace(pagesDir, "")
        .replace(".astro", "")
        .replace(".md", "");

      console.log(route || "/");
    }
  });
}

function analyzeComponents() {
  const compDir = path.join(root, "src/components");

  if (!fs.existsSync(compDir)) return;

  printSection("COMPONENTS");

  const files = walk(compDir);

  files.forEach(f => {
    if (f.endsWith(".astro")) {
      console.log(f.replace(root, ""));
    }
  });
}

function analyzeData() {
  const dataDir = path.join(root, "src/data");

  if (!fs.existsSync(dataDir)) return;

  printSection("DATASETS");

  const files = walk(dataDir);

  files.forEach(f => {
    if (f.endsWith(".json")) {
      const raw = fs.readFileSync(f, "utf-8");
      try {
        const json = JSON.parse(raw);

        let count = 0;

        if (Array.isArray(json)) count = json.length;
        if (typeof json === "object") count = Object.keys(json).length;

        console.log(`${path.basename(f)} -> entries: ${count}`);
      } catch {
        console.log(`${path.basename(f)} -> invalid JSON`);
      }
    }
  });
}

function analyzeCategories() {
  const toolsFile = path.join(root, "src/data/tools.json");

  if (!fs.existsSync(toolsFile)) return;

  printSection("CATEGORY ANALYSIS");

  const tools = JSON.parse(fs.readFileSync(toolsFile));

  const categories = {};
  const tags = {};

  tools.forEach(tool => {
    if (tool.category) {
      categories[tool.category] = (categories[tool.category] || 0) + 1;
    }

    if (tool.tags) {
      tool.tags.forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });
    }
  });

  console.log("\nTop Categories:\n");

  Object.entries(categories)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,20)
    .forEach(([cat,count]) => {
      console.log(cat, "->", count);
    });

  console.log("\nTop Tags:\n");

  Object.entries(tags)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,20)
    .forEach(([tag,count]) => {
      console.log(tag, "->", count);
    });
}

function analyzeBuild() {
  const dist = path.join(root, "dist");

  if (!fs.existsSync(dist)) return;

  printSection("GENERATED BUILD PAGES");

  const files = walk(dist);

  files.forEach(f => {
    if (f.endsWith(".html")) {
      console.log(f.replace(dist,""));
    }
  });
}

printSection("AIEXPERTSCORNER PROJECT AUDIT");

analyzePages();
analyzeComponents();
analyzeData();
analyzeCategories();
analyzeBuild();

printSection("AUDIT COMPLETE");
