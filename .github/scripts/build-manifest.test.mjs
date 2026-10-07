import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readBuildManifest, removeStaleFile, validateBuildManifest } from "./build-manifest.mjs";

test("validates manifest structure and file metadata", () => {
  const manifest = validateBuildManifest({
    configFingerprint: "fingerprint",
    files: {
      "old/nested.html": { signature: "abc", size: 12, mtimeMs: 34 },
      "legacy.css": "legacy-signature"
    }
  });

  assert.equal(manifest.configFingerprint, "fingerprint");
  assert.equal(Object.keys(manifest.files).length, 2);
});

test("rejects malformed manifest structures and file keys", () => {
  for (const value of [
    null,
    [],
    { files: [] },
    { configFingerprint: 42, files: {} },
    { files: { "../outside": "signature" } },
    { files: { "/absolute": "signature" } },
    { files: { "C:/absolute": "signature" } },
    { files: { "nested\\outside": "signature" } },
    { files: { "nested//file": "signature" } },
    { files: { file: { signature: "abc", size: -1, mtimeMs: 1 } } }
  ]) {
    assert.throws(() => validateBuildManifest(value));
  }
});

test("loads and validates the manifest before returning it", async (t) => {
  const temporaryDirectory = await mkdtemp(join(os.tmpdir(), "build-manifest-"));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  const manifestPath = join(temporaryDirectory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({ files: { "../outside": "signature" } }));

  await assert.rejects(readBuildManifest(manifestPath), /Invalid build manifest file path/);
});

test("removes a legitimate stale file below the output directory", async (t) => {
  const temporaryDirectory = await mkdtemp(join(os.tmpdir(), "build-manifest-"));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  const output = join(temporaryDirectory, "dist");
  const staleFile = join(output, "old", "stale.html");
  await mkdir(join(output, "old"), { recursive: true });
  await writeFile(staleFile, "stale");

  await removeStaleFile(output, "old/stale.html");

  await assert.rejects(readFile(staleFile), { code: "ENOENT" });
});

test("refuses to remove a stale file through a symlink escaping output", async (t) => {
  const temporaryDirectory = await mkdtemp(join(os.tmpdir(), "build-manifest-"));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  const output = join(temporaryDirectory, "dist");
  const outside = join(temporaryDirectory, "outside");
  await mkdir(output);
  await mkdir(outside);
  await writeFile(join(outside, "keep.html"), "keep");
  await symlink(outside, join(output, "linked"));

  await assert.rejects(removeStaleFile(output, "linked/keep.html"), /through a symlink/);
  assert.equal(await readFile(join(outside, "keep.html"), "utf8"), "keep");
});
