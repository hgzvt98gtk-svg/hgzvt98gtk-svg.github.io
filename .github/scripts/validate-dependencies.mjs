import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";

const root = fileURLToPath(new URL("../..", import.meta.url));
const scriptRoot = join(root, ".github", "scripts");
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
  relativePath: filePath.startsWith(rootPrefix) ? filePath.slice(rootPrefix.length) : filePath
}]));
const graph = new Map(
  await Promise.all(files.map(async (filePath) => [filePath, await parseImports(filePath, fileSet)]))
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

console.log(`Validated dependency graph for ${files.length} modules (no cycles, boundaries respected).`);
