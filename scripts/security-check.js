#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const skipExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".pdf",
  ".zip",
  ".gz",
  ".lock",
  ".db",
  ".sqlite",
  ".sqlite3",
  ".woff",
  ".woff2",
  ".ttf",
]);

const patterns = [
  { name: "OpenAI API key", regex: /sk-[A-Za-z0-9]{20,}/g },
  { name: "Stripe secret key", regex: /sk_live_[A-Za-z0-9]{10,}/g },
  { name: "Stripe webhook secret", regex: /whsec_[A-Za-z0-9]{10,}/g },
  { name: "AWS access key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "Slack token", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: "Private key", regex: /-----BEGIN (RSA|EC|PRIVATE) KEY-----/g },
  {
    name: "Hardcoded secret env",
    regex: /(OPENAI_API_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|NEXTAUTH_SECRET|SESSION_SECRET)\s*=(?!=)[^\n\r]+/g,
  },
];

function listTrackedFiles() {
  const stdout = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" });
  return stdout.split("\n").filter(Boolean);
}

function isBinaryOrSkipped(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return skipExtensions.has(ext);
}

function checkGitIgnore() {
  const gitignorePath = path.join(repoRoot, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return [];
  const content = fs.readFileSync(gitignorePath, "utf8");
  const warnings = [];
  if (!content.includes(".env")) {
    warnings.push(".gitignore does not include .env");
  }
  return warnings;
}

function main() {
  const files = listTrackedFiles();
  const findings = [];
  const warnings = checkGitIgnore();

  if (files.includes(".env") || files.some((f) => f.startsWith(".env."))) {
    findings.push({ file: ".env", pattern: "Tracked env file" });
  }

  for (const file of files) {
    if (isBinaryOrSkipped(file)) continue;
    const absPath = path.join(repoRoot, file);
    if (!fs.existsSync(absPath)) continue;
    let content = "";
    try {
      content = fs.readFileSync(absPath, "utf8");
    } catch {
      continue;
    }
    for (const pattern of patterns) {
      if (pattern.regex.test(content)) {
        findings.push({ file, pattern: pattern.name });
      }
      pattern.regex.lastIndex = 0;
    }
  }

  if (warnings.length) {
    console.warn("Warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (findings.length) {
    console.error("Potential secrets detected:");
    for (const item of findings) {
      console.error(`- ${item.file}: ${item.pattern}`);
    }
    process.exit(1);
  }

  console.log("security-check: no secrets detected in tracked files");
}

main();
