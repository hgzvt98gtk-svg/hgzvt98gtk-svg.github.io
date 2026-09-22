import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";
import { fileSignature } from "./file-signature.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const scriptRoot = join(root, ".github", "scripts");
const cachePath = join(root, ".cache", "validate-dependencies.json");
const cacheVersion = 1;
const entryFiles = [join(root, "build.mjs"), join(root, "app.js")];
const sourceExtensions = new Set([".mjs", ".js"]);
const boundaryRules = new Map([
  ["site-paths.mjs", new Set()],
  ["site.config.mjs", new Set(["site-paths.mjs"])],
  ["build.config.mjs", new Set()],
  ["validation-roots.mjs", new Set()],
  ["site-urls.mjs", new Set(["site.config.mjs", "site-paths.mjs"])],
  ["validate-config.mjs", new Set(["site-paths.mjs"])]
]);
const rootPrefix = `${root}/`;

function toRelativePath(path) {
  return path.startsWith(rootPrefix) ? path.slice(rootPrefix.length) : relative(root, path);
}

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(path);
    }
    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  }))).flat();
}

function resolveImportPath(importerPath, specifier, fileSet) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const candidateBase = resolve(dirname(importerPath), specifier);
  const candidates = extname(specifier)
    ? [candidateBase]
    : [
      `${candidateBase}.mjs`,
      `${candidateBase}.js`,
      join(candidateBase, "index.mjs"),
      join(candidateBase, "index.js")
    ];

  for (const candidate of candidates.map((path) => normalize(path))) {
    if (fileSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function parseImports(filePath, fileSet) {
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
  return importSpecifiers.map((specifier) => resolveImportPath(filePath, specifier, fileSet)).filter(Boolean);
}

async function loadCache() {
  try {
    const text = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(text);
    if (parsed?.version !== cacheVersion || typeof parsed.files !== "object" || parsed.files === null) {
      return { files: {} };
    }
    return { files: parsed.files };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { files: {} };
    }
    return { files: {} };
  }
}

async function saveCache(cache) {
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify({ version: cacheVersion, files: cache.files }, null, 2)}\n`);
}

function findCycle(graph) {
  const state = new Map();
  const stack = [];
  const stackIndexes = new Map();

  function dfs(node) {
    state.set(node, "visiting");
    stackIndexes.set(node, stack.length);
    stack.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      const neighborState = state.get(neighbor);
      if (neighborState === "visiting") {
        const start = stackIndexes.get(neighbor);
        return [...stack.slice(start), neighbor];
      }
      if (!neighborState) {
        const cycle = dfs(neighbor);
        if (cycle) {
          return cycle;
        }
      }
    }

    stackIndexes.delete(node);
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

function findBoundaryViolations(graph, fileInfoByPath) {
  const violations = [];

  for (const [fromPath, toPaths] of graph) {
    const fromInfo = fileInfoByPath.get(fromPath);
    const allowedImports = boundaryRules.get(fromInfo.fileName);
    if (!allowedImports) {
      continue;
    }

    for (const toPath of toPaths) {
      const toInfo = fileInfoByPath.get(toPath);
      if (!allowedImports.has(toInfo.fileName)) {
        violations.push({ fromPath, toPath });
      }
    }
  }

  return violations;
}

function validateBoundaryRuleCoverage(fileInfoByPath) {
  const graphFileNames = new Set([...fileInfoByPath.values()].map(({ fileName }) => fileName));
  const staleBoundaryRules = [...boundaryRules.keys()].filter((fileName) => !graphFileNames.has(fileName));
  if (staleBoundaryRules.length > 0) {
    throw new Error(
      `boundaryRules has entries for files that are not in the dependency graph: ${staleBoundaryRules.join(", ")}.\n`
      + "Remove stale entries or update boundaryRules for renamed files."
    );
  }
}

const files = [...new Set([...(await listSourceFiles(scriptRoot)), ...entryFiles])].map((filePath) => normalize(filePath));
const fileSet = new Set(files);
const fileInfoByPath = new Map(files.map((filePath) => [filePath, {
  fileName: basename(filePath),
  relativePath: toRelativePath(filePath)
}]));
const previousCache = await loadCache();
const nextCache = { files: {} };
const graph = new Map(
  await Promise.all(files.map(async (filePath) => {
    const relativePath = toRelativePath(filePath);
    const signature = fileSignature(await stat(filePath));
    const cached = previousCache.files[relativePath];
    let imports = null;

    if (cached?.signature === signature && Array.isArray(cached.imports)) {
      const restoredImports = cached.imports
        .map((importPath) => normalize(join(root, importPath)))
        .filter((importPath) => fileSet.has(importPath));
      if (restoredImports.length === cached.imports.length) {
        imports = restoredImports;
      }
    }

    if (!imports) {
      imports = await parseImports(filePath, fileSet);
    }

    nextCache.files[relativePath] = {
      signature,
      imports: imports.map((importPath) => toRelativePath(importPath))
    };

    return [filePath, imports];
  }))
);

const cycle = findCycle(graph);
if (cycle) {
  const display = cycle.map((path) => fileInfoByPath.get(path).relativePath).join(" -> ");
  throw new Error(`Circular dependency detected: ${display}`);
}

validateBoundaryRuleCoverage(fileInfoByPath);

const boundaryViolations = findBoundaryViolations(graph, fileInfoByPath);
if (boundaryViolations.length > 0) {
  const violationList = boundaryViolations
    .map(({ fromPath, toPath }) => `${fileInfoByPath.get(fromPath).relativePath} -> ${fileInfoByPath.get(toPath).relativePath}`)
    .join("\n");
  throw new Error(
    `Dependency boundary violation(s) detected:\n${violationList}\n\n`
    + "If a low-level module intentionally needs new dependencies, update boundaryRules in .github/scripts/validate-dependencies.mjs."
  );
}

await saveCache(nextCache);

console.log(`Validated dependency graph for ${files.length} modules (no cycles, boundaries respected).`);
