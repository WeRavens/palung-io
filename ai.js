// ============================================================================
// AI CLIENT — TERHUBUNG LANGSUNG KE CLOUDFLARE WORKER MULTI-PROVIDER PROXY
// Pemilihan model & fallback antar-provider (Groq, Gemini, NVIDIA, OpenRouter)
// sepenuhnya diatur oleh Cloudflare Worker di recall-ai-proxy.dev-weravens.workers.dev
// ============================================================================

const DEFAULT_PROXY_URL = "https://recall-ai-proxy.dev-weravens.workers.dev";

let lastUsedModel = null;
let totalSuccess = 0;
let totalError = 0;

function getProxyUrl() {
  return (process.env.AI_PROXY_URL || DEFAULT_PROXY_URL).trim();
}

function isEnabled() {
  return Boolean(getProxyUrl());
}

function extractJsonObject(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;

  const slice =
    lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned.slice(firstBrace);

  try {
    return JSON.parse(slice);
  } catch (e) {
    // Coba perbaiki trailing comma sebelum ] atau }
    try {
      const fixed = slice.replace(/,\s*([\]}])/g, "$1");
      return JSON.parse(fixed);
    } catch (e2) {
      // Jika terpotong di tengah array answers, ekstrak semua objek jawaban yang utuh
      const answersMatch = slice.match(/"answers"\s*:\s*\[([\s\S]*)/);
      if (answersMatch) {
        const items = [];
        const itemRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"score"\s*:\s*(\d+)\s*,\s*"fact"\s*:\s*"([^"]*)"\s*\}/g;
        let m;
        while ((m = itemRegex.exec(answersMatch[1])) !== null) {
          items.push({ name: m[1], score: Number(m[2]), fact: m[3] });
        }
        if (items.length >= 4) {
          return { answers: items };
        }
      }
      return null;
    }
  }
}

async function callCloudWorkerAI(messages, { temperature = 0.25, maxTokens = 800 } = {}) {
  const endpoint = getProxyUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      totalError += 1;
      const errText = await res.text().catch(() => "");
      throw new Error(`Worker HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const model = data?.model || "cloudflare-worker-auto";
    lastUsedModel = model;
    totalSuccess += 1;
    return { model, content };
  } catch (err) {
    clearTimeout(timeout);
    totalError += 1;
    throw err;
  }
}

async function validateAnswerWithAI(categoryTitle, categoryHint, rawInput) {
  if (!isEnabled()) return null;

  const systemPrompt =
    "Kamu adalah wasit kuis trivia kelangkaan berbahasa Indonesia bernama PALUNG.IO. " +
    "Tugasmu menilai apakah jawaban pemain BENAR dan SAH untuk kategori yang diberikan. " +
    "Balas HANYA dalam format JSON valid tanpa teks lain: " +
    '{"valid": true/false, "canonicalName": "Nama Baku Rapi", "score": angka_10_sampai_100, "fact": "1 kalimat fakta edukatif menarik dalam bahasa Indonesia"}. ' +
    "Panduan skor kelangkaan: 10-34 = sangat umum/pasaran, 35-64 = cukup unik, 65-88 = langka/spesifik, 89-100 = sangat langka namun faktual benar.";

  const userPrompt = `Kategori: "${categoryTitle}"\nPetunjuk: "${categoryHint || "-"}"\nJawaban pemain: "${rawInput}"\nApakah jawaban ini benar secara faktual?`;

  const { model, content } = await callCloudWorkerAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.15, maxTokens: 280 }
  );

  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed.valid !== "boolean") {
    throw new Error("Format respons AI tidak valid saat menilai jawaban.");
  }

  if (!parsed.valid) {
    return { valid: false, modelUsed: model };
  }

  return {
    valid: true,
    canonicalName: String(parsed.canonicalName || rawInput).trim(),
    score: Math.min(100, Math.max(10, Math.round(Number(parsed.score) || 55))),
    fact: String(parsed.fact || "Fakta menarik yang ditemukan bersama Sonar AI Palung.io!").trim(),
    modelUsed: model
  };
}

async function generateCategoryWithAI(topic, theme = "umum") {
  const systemPrompt =
    "Kamu adalah kurator konten kuis edukasi PALUNG.IO berbahasa Indonesia. " +
    "Buatlah kategori trivia terbuka dengan 16 jawaban faktual yang tersebar merata di 4 tingkat kelangkaan: " +
    "4 jawaban umum (skor 12-32), 4 cukup unik (36-62), 4 langka (66-86), 4 sangat langka (90-99). " +
    "Balas HANYA JSON valid tanpa teks pembuka/penutup: " +
    '{"title": "Sebutkan ...", "hint": "Petunjuk singkat", "educationalNote": "1 kalimat pengantar edukasi", "answers": [{"name": "...", "score": 15, "fact": "1 kalimat fakta singkat"}]}.';

  const userPrompt = `Buat kategori kuis tentang topik: "${topic}" (tema: ${theme}). Pastikan seluruh fakta akurat, singkat, dan ramah semua umur.`;

  const { model, content } = await callCloudWorkerAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.3, maxTokens: 3200 }
  );

  const parsed = extractJsonObject(content);
  if (!parsed || !Array.isArray(parsed.answers) || parsed.answers.length < 4) {
    throw new Error("AI tidak mengembalikan format kategori yang valid.");
  }

  return {
    modelUsed: model,
    title: String(parsed.title || `Sebutkan ${topic}`).trim(),
    hint: String(parsed.hint || `Kategori seputar ${topic}`).trim(),
    educationalNote: String(parsed.educationalNote || `Kategori edukasi tentang ${topic}.`).trim(),
    answers: parsed.answers
      .filter((a) => a && a.name)
      .map((a) => ({
        name: String(a.name).trim(),
        score: Math.min(100, Math.max(10, Math.round(Number(a.score) || 50))),
        fact: String(a.fact || "Fakta menarik!").trim()
      }))
  };
}

function getAiStatus() {
  return {
    enabled: isEnabled(),
    proxyUrl: getProxyUrl(),
    routing: "managed-by-cloudflare-worker",
    lastUsedModel,
    totalSuccess,
    totalError
  };
}

module.exports = {
  isEnabled,
  validateAnswerWithAI,
  generateCategoryWithAI,
  getAiStatus
};
