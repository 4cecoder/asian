#!/usr/bin/env bun
/**
 * Export published content packets as OKF v0.2 directories.
 *
 * Pulls bundles via the Convex CLI (`bunx convex run
 * packets:exportPublishedPackets --json`), then writes one directory per
 * packet under apps/web/packets/ (gitignored):
 *
 *   <out>/<package_id>/packet.json     <- manifest, written LAST
 *   <out>/<package_id>/phrases.json    <- main payload per kind
 *
 * SHA-256 checksums are computed over the exact bytes written, injected
 * into the manifest, and the manifest is validated against
 * docs/knowledge/content-packet-format.md BEFORE anything touches disk.
 * A packet with validation errors aborts that packet (exit code 1 at the
 * end), never silently ships.
 *
 * Usage:
 *   bun scripts/export-packets.ts [--dry-run] [--out <dir>] [convex args...]
 *
 *   --help          This text (fully offline).
 *   --dry-run       Fetch + hash + validate, write nothing.
 *   --out <dir>     Output root. Default: <apps/web>/packets/
 *   Any other args are passed through to `bunx convex run`, e.g.
 *   --prod or --url https://<deployment>.cloud.convex.cloud
 *
 * Requires an authenticated Convex CLI (same login as `bunx convex dev`).
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateManifest } from "../src/features/packets/manifest";
import type { OkfManifest } from "../src/features/packets/manifest";
import { countForPayload } from "../src/features/packets/buildPayload";

interface ExportBundle {
  packetId: string;
  status: string;
  entryCount: number;
  manifest: OkfManifest;
  payloadFiles: Record<string, unknown>;
}

const USAGE = `Export published content packets as OKF v0.2 directories.

Usage:
  bun scripts/export-packets.ts [--help] [--dry-run] [--out <dir>] [convex args...]

Options:
  --help        Show this help and exit (offline).
  --dry-run     Fetch, hash, and validate; do not write any files.
  --out <dir>   Output root directory (default: apps/web/packets).

Any remaining arguments are forwarded to "bunx convex run", e.g. --prod.
Requires an authenticated Convex CLI.`;

interface ParsedArgs {
  help: boolean;
  dryRun: boolean;
  out?: string;
  passthrough: string[];
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = { help: false, dryRun: false, passthrough: [] };
  const rest = [...argv];
  while (rest.length > 0) {
    const arg = rest.shift()!;
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--out") parsed.out = rest.shift();
    else parsed.passthrough.push(arg);
  }
  return parsed;
}

/** Run the internal query through the Convex CLI and parse its result output. */
function fetchBundles(passthrough: readonly string[]): ExportBundle[] {
  // NOTE: no --json flag — current convex-cli versions reject it. `convex
  // run` prints the result as (pretty-printed) JSON; parseCliJson below
  // extracts it even with stray lines around it.
  const result = spawnSync(
    "bunx",
    ["convex", "run", "packets:exportPublishedPackets", ...passthrough],
    {
      encoding: "utf8",
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) {
    process.stderr.write(
      `Failed to run "bunx convex run packets:exportPublishedPackets".\n` +
        `${result.stderr ?? ""}${result.error ? String(result.error) : ""}\n` +
        `Check that you are logged in (bunx convex login), that this code is\n` +
        `pushed to the deployment (bunx convex dev), and pass deployment\n` +
        `selectors like --prod after the script flags.\n`,
    );
    process.exit(1);
  }
  return parseCliJson(result.stdout ?? "");
}

/**
 * `convex run --json` prints the result value as JSON; be defensive about
 * stray log lines by scanning for the outermost object.
 */
function parseCliJson(stdout: string): ExportBundle[] {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed) as ExportBundle[];
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as ExportBundle[];
      } catch {
        // fall through
      }
    }
  }
  process.stderr.write(
    `Could not parse convex run output as JSON.\nRaw output:\n${stdout.slice(0, 2000)}\n`,
  );
  process.exit(1);
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const outRoot = path.resolve(
    args.out ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "packets"),
  );

  const bundles = fetchBundles(args.passthrough);
  if (bundles.length === 0) {
    process.stdout.write("No published packets found. Nothing to export.\n");
    return;
  }

  let failures = 0;
  let exported = 0;

  for (const bundle of bundles) {
    const label = bundle.packetId;

    // 1. Serialize payloads deterministically (pretty JSON + trailing \n).
    const files = new Map<string, Buffer>();
    for (const [filename, payload] of Object.entries(bundle.payloadFiles)) {
      files.set(filename, Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8"));
    }

    // 2. Inject checksums (hash of the exact bytes above) + real count.
    const manifest = bundle.manifest;
    manifest.payload.checksums = Object.fromEntries(
      [...files.entries()].map(([name, bytes]) => [name, `sha256:${sha256Hex(bytes)}`]),
    );
    const mainPayload = bundle.payloadFiles[manifest.structure.main_content];
    manifest.payload.count = countForPayload(manifest.kind, mainPayload);

    // 3. Consumer-contract validation before anything is written.
    const issues = validateManifest(manifest, { actualCount: manifest.payload.count });
    if (issues.length > 0) {
      failures++;
      process.stderr.write(`✗ ${label}: ${issues.length} validation issue(s); skipped.\n`);
      for (const issue of issues) {
        process.stderr.write(`    [${issue.code}] ${issue.path}: ${issue.message}\n`);
      }
      continue;
    }

    // 4. Write payload files first, manifest last (its checksums refer to them).
    if (!args.dryRun) {
      const dir = path.join(outRoot, manifest.package_id);
      await mkdir(dir, { recursive: true });
      for (const [name, bytes] of files) {
        await writeFile(path.join(dir, name), bytes);
      }
      await writeFile(
        path.join(dir, "packet.json"),
        Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
      );
    }
    exported++;
    const verb = args.dryRun ? "would export" : "exported";
    process.stdout.write(
      `✓ ${verb} ${manifest.package_id} v${manifest.version} ` +
        `(${manifest.payload.count} entries, ${files.size} payload file(s))\n`,
    );
  }

  process.stdout.write(
    `\nDone: ${exported} ok, ${failures} failed${args.dryRun ? " (dry-run, nothing written)" : `, out: ${outRoot}`}\n`,
  );
  if (failures > 0) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  await main().catch((error: unknown) => {
    process.stderr.write(`Fatal: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
