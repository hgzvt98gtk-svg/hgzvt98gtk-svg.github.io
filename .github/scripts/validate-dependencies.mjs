import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";

const root = fileURLToPath(new URL("../..", import.meta.url));
const scriptRoot = join(root, ".github", "scripts");
const entryFiles = [join(root, "build.mjs")];

async function listMjsFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMjsFiles(path));
      continue;
    }
    if (extname(entry.name) === ".mjs") {
      files.push(path);
    }
  }

  return files;
}

function resolveImportPath(importerPath, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const resolved = specifier.endsWith(".mjs")
    ? resolve(dirname(importerPath), specifier)
    : resolve(dirname(importerPath), `${specifier}.mjs`);

  return normalize(resolved);
}

async function parseImports(filePath) {
  const source = await readFile(filePath, "utf8");
  const program = parse(source, { ecmaVersion: "latest", sourceType: "module" });
  const importSpecifiers = program.body.flatMap((node) => {
    if (node.type === "ImportDeclaration") {
      return [node.source.value];
    }
    if ((node.type === "ExportAllDeclaration" || node.type === "ExportNamedDeclaration") && node.source) {
      return [node.source.value];
    }
    return [];
  });
  return importSpecifiers.map((specifier) => resolveImportPath(filePath, specifier)).filter(Boolean);
}

function findCycle(graph) {
  const state = new Map();
  const stack = [];

  function dfs(node) {
    state.set(node, "visiting");
    stack.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      const neighborState = state.get(neighbor);
      if (neighborState === "visiting") {
        const start = stack.indexOf(neighbor);
        return [...stack.slice(start), neighbor];
      }
      if (!neighborState) {
        const cycle = dfs(neighbor);
        if (cycle) {
          return cycle;
        }
      }
    }

    stack.pop();
    state.set(node, "visited");
    return null;
  }

  for (const node of graph.keys()) {
    if (!state.get(node)) {
      const cycle = dfs(node);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}

const files = [...new Set([...(await listMjsFiles(scriptRoot)), ...entryFiles])].map((filePath) => normalize(filePath));
const fileSet = new Set(files);
const graph = new Map();

for (const filePath of files) {
  const imports = await parseImports(filePath);
  graph.set(filePath, imports.filter((candidate) => fileSet.has(candidate)));
}

const cycle = findCycle(graph);
if (cycle) {
  const display = cycle.map((path) => path.replace(`${root}/`, "")).join(" -> ");
  throw new Error(`Circular dependency detected: ${display}`);
}

console.log(`Validated dependency graph for ${files.length} modules (no cycles).`);
