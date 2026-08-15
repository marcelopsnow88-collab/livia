import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const includeRoots = ["api", "lib", "scripts", "supabase"];
const rootFiles = [
  ".env.example",
  ".gitignore",
  ".vercelignore",
  "index.html",
  "package.json",
  "package-lock.json",
  "postcss.config.mjs",
  "tsconfig.json",
  "vercel.json",
  "vite.config.ts",
];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "ui" && full.includes(`${path.sep}src${path.sep}app${path.sep}components${path.sep}ui`)) {
        continue;
      }
      if (entry.name === "imports" && full.includes(`${path.sep}src${path.sep}imports`)) {
        continue;
      }
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

const paths = new Set(rootFiles);
for (const r of includeRoots) {
  walk(path.join(root, r), []).forEach((f) => paths.add(path.relative(root, f).replace(/\\/g, "/")));
}
walk(path.join(root, "src"), []).forEach((f) => {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  if (!rel.includes("src/app/components/ui/") && !rel.startsWith("src/imports/")) {
    paths.add(rel);
  }
});

const files = [...paths]
  .sort()
  .map((p) => ({ path: p, content: fs.readFileSync(path.join(root, p), "utf8") }));

const batch1Paths = new Set([
  ...rootFiles,
  ...files.map((f) => f.path).filter((p) => p.startsWith("api/") || p.startsWith("lib/") || p.startsWith("scripts/")),
]);

const batch1 = {
  owner: "marcelopsnow88-collab",
  repo: "livia",
  branch: "main",
  message: "Initial commit: config, API routes, lib and scripts",
  files: files.filter((f) => batch1Paths.has(f.path)),
};

const batch2 = {
  owner: "marcelopsnow88-collab",
  repo: "livia",
  branch: "main",
  message: "Add frontend source and Supabase migrations",
  files: files.filter((f) => !batch1Paths.has(f.path)),
};

fs.writeFileSync(path.join(root, ".github-push-final-1.json"), JSON.stringify(batch1));
fs.writeFileSync(path.join(root, ".github-push-final-2.json"), JSON.stringify(batch2));

console.log(`Total ${files.length} | Batch1 ${batch1.files.length} | Batch2 ${batch2.files.length}`);
console.log(`Has env.local: ${files.some((f) => f.path.includes(".env.local"))}`);
