import fs from "fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Resolve pdf-parse in a robust way (handles CJS, ESM, forks)
async function loadPdfParse() {
  try {
    const m = await import("pdf-parse");
    const cand = m?.default ?? m?.parse ?? m;
    if (typeof cand === "function") return cand;
  } catch (_) { /* empty */ }

  try {
    const m = require("pdf-parse");
    const cand = (typeof m === "function" ? m : (m?.default ?? m?.parse));
    if (typeof cand === "function") return cand;
  } catch (_) { /* empty */ }

  try {
    const m = require("pdf-parse/lib/pdf-parse.js");
    const cand = (typeof m === "function" ? m : (m?.default ?? m?.parse));
    if (typeof cand === "function") return cand;
  } catch (_) { /* empty */ }

  throw new Error("Unable to load a callable pdf-parse function");
}

async function loadMammoth() {
  try {
    const m = await import("mammoth");
    return m?.default ?? m;
  } catch {
    const m = require("mammoth");
    return m?.default ?? m;
  }
}

// ✅ your main function
export async function extractTextFromCV(filePath, mimetype = "", originalname = "") {
  const buf = await fs.readFile(filePath);
  const name = (originalname || "").toLowerCase();
  const mt = (mimetype || "").toLowerCase();

  // --- PDF branch ---
  if (mt === "application/pdf" || name.endsWith(".pdf")) {
    try {
      const pdfParse = await loadPdfParse();
      const out = await pdfParse(buf);
      return out?.text || "";
    } catch (e) {
      console.warn("pdf-parse failed:", e.message);
      return "";
    }
  }

  // --- DOCX branch ---
  if (
    name.endsWith(".docx") ||
    mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mt.includes("wordprocessingml")
  ) {
    try {
      const mammoth = await loadMammoth();
      const out = await mammoth.extractRawText({ buffer: buf });
      return out?.value || "";
    } catch (e) {
      console.warn("mammoth failed:", e.message);
      return "";
    }
  }

  // --- Fallback (legacy .doc or unknown) ---
  try {
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

// at bottom of cv-text.js
export { extractTextFromCV as extractTextFromPDFOrDoc };

