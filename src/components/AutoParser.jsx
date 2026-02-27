import React, { useState } from "react";
// parseWordTest.js ni siz ilgari joylagan joyga mos yo'l bilan import qiling.
// Agar parseWordTest.js src/components ichida bo'lsa quyidagicha bo'ladi:
import parseWordDocument, { parseInlineOptionsAndAnswer } from "./parseWordTest";

/**
 * AutoParser
 * - Qabul qiladi: .docx, .json, .txt (va oddiy text blob)
 * - Agar .docx bo'lsa: mammoth bilan text oladi (dinamik import)
 * - JSON bo'lsa: parse qilinadi va normalizatsiya qilinadi
 * - Natijada `tests` massivini beradi: [{ question, options: [], correctAnswer, correctLetter }]
 */
export default function AutoParser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tests, setTests] = useState(null);
  const [rawTextPreview, setRawTextPreview] = useState("");

  const resetState = () => {
    setError("");
    setTests(null);
    setRawTextPreview("");
  };

  const handleFile = async (file) => {
    resetState();
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const name = (file.name || "").toLowerCase();
      const ext = name.split(".").pop();

      if (ext === "json" || file.type === "application/json") {
        // read as text and parse JSON
        const txt = await file.text();
        setRawTextPreview(txt.slice(0, 4000));
        const parsed = JSON.parse(txt);
        // Normalize JSON structure to tests[]
        const normalized = normalizeFromJSON(parsed);
        setTests(normalized);
        setLoading(false);
        return;
      }

      if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // try dynamic import of mammoth (so app doesn't fail if not installed)
        let mammoth;
        try {
          mammoth = (await import("mammoth")).default || (await import("mammoth"));
        } catch (mErr) {
          throw new Error("Document (.docx) parser 'mammoth' kutubxonasi topilmadi. Iltimos: npm install mammoth");
        }

        // read as arrayBuffer and convert to plain text
        const arrayBuffer = await file.arrayBuffer();
        const { value: htmlOrText } = await mammoth.extractRawText({ arrayBuffer });
        // mammoth.extractRawText returns { value: 'plain text', messages: [] }
        const plain = typeof htmlOrText === "string" ? htmlOrText : String(htmlOrText);
        setRawTextPreview(plain.slice(0, 4000));
        // pass plain text to parser
        const parsedTests = parseWordDocument(plain);
        setTests(parsedTests);
        setLoading(false);
        return;
      }

      // For .txt or unknown types: read as text and attempt to parse
      const txt = await file.text();
      setRawTextPreview(txt.slice(0, 4000));

      // Heuristics: if text starts with '[' or '{' it's JSON-like
      const trimmed = txt.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          const normalized = normalizeFromJSON(parsed);
          setTests(normalized);
          setLoading(false);
          return;
        } catch (e) {
          // not JSON -> fall through to text parsing
        }
      }

      // else treat as plain text with possible inline options
      const parsedTests = parseWordDocument(txt);
      setTests(parsedTests);
      setLoading(false);
    } catch (err) {
      console.error("AutoParser error:", err);
      setError(err?.message || String(err));
      setLoading(false);
    }
  };

  // Normalizes a JSON structure into the expected tests[] format.
  // Accepts:
  // - array of test objects
  // - object with tests property
  // - legacy formats
  const normalizeFromJSON = (obj) => {
    // If already an array of tests
    if (Array.isArray(obj)) {
      return obj.map(normalizeTestItem).filter(Boolean);
    }

    // If object has tests field
    if (obj && typeof obj === "object") {
      if (Array.isArray(obj.tests)) {
        return obj.tests.map(normalizeTestItem).filter(Boolean);
      }
      // if the object itself looks like a single test
      return [normalizeTestItem(obj)].filter(Boolean);
    }

    // fallback empty
    return [];
  };

  // Normalize a single item to { question, options, correctAnswer, correctLetter }
  const normalizeTestItem = (item) => {
    if (!item || typeof item !== "object") return null;

    // Possible keys variations
    const q = item.question || item.savol || item.title || item.name || item.text || "";
    const opts = item.options || item.variants || item.answers || item.choices || [];
    const correct = item.correctAnswer || item.correct || item.right || item.answer || item.correctAnswerText || "";

    // If opts is object keyed by A/B/C: turn into array in order A-D
    let normalizedOptions = [];
    if (Array.isArray(opts)) {
      normalizedOptions = opts.map(String);
    } else if (typeof opts === "object") {
      ["A","B","C","D"].forEach((L) => {
        if (opts[L]) normalizedOptions.push(String(opts[L]));
      });
      // also push any other keys
      Object.keys(opts).forEach((k) => {
        if (!["A","B","C","D"].includes(k)) normalizedOptions.push(String(opts[k]));
      });
    } else if (typeof opts === "string" && opts.trim()) {
      // maybe options provided as inline string -> try parsing inline
      const parsed = parseInlineOptionsAndAnswer(opts);
      if (parsed && parsed.optionsArray && parsed.optionsArray.length) {
        normalizedOptions = parsed.optionsArray.map(o => o.text);
      } else {
        // split on semicolons or newline
        normalizedOptions = opts.split(/\r?\n|;+/).map(s => s.trim()).filter(Boolean);
      }
    }

    // Determine correctAnswer
    let correctAnswerText = "";
    let correctLetter = "";
    if (typeof correct === "string" && correct.trim()) {
      // if it's single letter
      const trimC = correct.trim();
      const letterMatch = trimC.match(/^([A-D])$/i);
      if (letterMatch) {
        correctLetter = letterMatch[1].toUpperCase();
        const idx = "ABCD".indexOf(correctLetter);
        if (normalizedOptions[idx]) correctAnswerText = normalizedOptions[idx];
      } else {
        // if it's textual, try to find matching option
        const found = normalizedOptions.find(o => o.trim() === trimC || o.trim().startsWith(trimC));
        correctAnswerText = found || trimC;
      }
    }

    return {
      question: String(q || "").trim(),
      options: normalizedOptions,
      correctAnswer: String(correctAnswerText || "").trim(),
      correctLetter: correctLetter
    };
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    await handleFile(file);
  };

  const downloadJSON = () => {
    if (!tests) return;
    const blob = new Blob([JSON.stringify(tests, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parsed-tests.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-white rounded shadow max-w-3xl mx-auto">
      <h3 className="text-lg font-semibold mb-2">Auto Parser — .docx / .json / .txt</h3>
      <p className="text-sm text-gray-600 mb-3">
        Faylni yuklang (.docx uchun mammoth kerak). Komponent avtomatik formatni aniqlaydi va testlarni chiqaradi.
      </p>

      <input type="file" accept=".docx,.json,.txt,text/plain,application/json" onChange={handleFileChange} />

      {loading && <p className="mt-3 text-blue-600">Yuklanmoqda...</p>}
      {error && <p className="mt-3 text-red-600">{error}</p>}

      {rawTextPreview && (
        <div className="mt-3">
          <h4 className="font-medium">Preview (bosh qism):</h4>
          <pre className="whitespace-pre-wrap max-h-40 overflow-auto p-2 bg-gray-50 border rounded">{rawTextPreview}</pre>
        </div>
      )}

      {tests && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Parsed tests: {tests.length}</h4>
            <div className="flex gap-2">
              <button onClick={downloadJSON} className="px-3 py-1 bg-green-600 text-white rounded">Download JSON</button>
              <button onClick={() => { setTests(null); setRawTextPreview(""); }} className="px-3 py-1 bg-gray-200 rounded">Clear</button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-auto p-2 border rounded bg-gray-50">
            {tests.map((t, i) => (
              <div key={i} className="p-2 bg-white rounded border">
                <div className="font-medium">#{i + 1} — {t.question || "(Savol yo'q)"}</div>
                <div className="text-sm text-gray-600 mt-1">Javoblar:</div>
                <ul className="list-disc ml-6">
                  {(t.options || []).map((opt, idx) => (
                    <li key={idx} className={t.correctAnswer === opt ? "font-semibold text-green-700" : ""}>
                      {String.fromCharCode(65 + idx)}. {opt}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-gray-500 mt-1">Correct: {t.correctLetter || "-"} {t.correctAnswer ? `— ${t.correctAnswer}` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}