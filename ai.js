// ============================================================================
// GROQ MULTI-MODEL AI ENGINE (AUTO-FALLBACK PER-MODEL QUOTA ROTATION)
// Mendukung 7 model dengan rotasi otomatis bila salah satu model kena limit/kuota.
// ============================================================================

const GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_PROXY_URL = "https://recall-ai-proxy.dev-weravens.workers.dev";

// Status cooldown per-model: { [modelName]: { cooldownUntil, lastError, successCount, errorCount } }
const modelStats = {};
GROQ_MODELS.forEach((m) => {
  modelStats[m] = {
    cooldownUntil: 0,
    lastError: null,
    successCount: 0,
    errorCount: 0
  };
});

function getApiKey() {
  return (process.env.GROQ_API_KEY || "").trim();
}

function getProxyUrl() {
  if (process.env.AI_PROXY_URL === "") return "";
  return (process.env.AI_PROXY_URL || DEFAULT_PROXY_URL).trim();
}

function isEnabled() {
  return Boolean(getProxyUrl() || getApiKey().length > 10);
}

function getAvailableModels() {
  const now = Date.now();
  const ready = GROQ_MODELS.filter((m) => (modelStats[m]?.cooldownUntil || 0) <= now);
  if (ready.length > 0) return ready;
  // Jika semua sedang cooldown, urutkan dari yang paling cepat selesai cooldown-nya
  return [...GROQ_MODELS].sort(
    (a, b) => (modelStats[a]?.cooldownUntil || 0) - (modelStats[b]?.cooldownUntil || 0)
  );
}

function extractJsonObject(text) {
  if (!text) return null;
  let cleaned = String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  const slice = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    return null;
  }
}

async function callGroqWithFallback(messages, { temperature = 0.25, maxTokens = 800 } = {}) {
  const proxyUrl = getProxyUrl();
  const apiKey = getApiKey();
  const endpoint = proxyUrl || GROQ_ENDPOINT;
  if (!proxyUrl && !apiKey) {
    throw new Error("AI_PROXY_URL atau GROQ_API_KEY belum dikonfigurasi di server.");
  }

  const headers = { "Content-Type": "application/json" };
  if (!proxyUrl && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const candidates = getAvailableModels();
  let lastErr = null;

  for (const model of candidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || "";
        modelStats[model].successCount += 1;
        modelStats[model].lastError = null;
        return { model, content };
      }

      const errText = await res.text().catch(() => "");
      modelStats[model].errorCount += 1;
      modelStats[model].lastError = `HTTP ${res.status}`;

      // Jika kuota / rate-limit model habis (429) atau model tidak tersedia (404/5xx),
      // tandai cooldown khusus untuk model ini dan langsung lanjut ke model berikutnya!
      const retryAfterSec = Number(res.headers.get("retry-after")) || 0;
      if (res.status === 429) {
        const waitMs = Math.max(60000, retryAfterSec * 1000);
        modelStats[model].cooldownUntil = Date.now() + waitMs;
        console.warn(`[AI] Kuota/rate-limit ${model} habis (429). Pindah ke model berikutnya...`);
      } else if (res.status === 404 || res.status === 400) {
        modelStats[model].cooldownUntil = Date.now() + 15 * 60 * 1000;
        console.warn(`[AI] Model ${model} tidak tersedia (${res.status}). Skip 15 menit.`);
      } else {
        modelStats[model].cooldownUntil = Date.now() + 90000;
        console.warn(`[AI] Error ${res.status} pada ${model}: ${errText.slice(0, 120)}`);
      }
      lastErr = new Error(`${model}: HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timeout);
      modelStats[model].errorCount += 1;
      modelStats[model].lastError = err.message;
      modelStats[model].cooldownUntil = Date.now() + 45000;
      lastErr = err;
      console.warn(`[AI] Timeout/error jaringan pada ${model}: ${err.message}`);
    }
  }

  throw lastErr || new Error("Semua model Groq AI sedang sibuk/limit.");
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

  const { model, content } = await callGroqWithFallback(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.15, maxTokens: 280 }
  );

  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed.valid !== "boolean") {
    return null;
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
  if (!isEnabled()) {
    throw new Error("GROQ_API_KEY belum diatur di server.");
  }

  const systemPrompt =
    "Kamu adalah kurator konten kuis edukasi PALUNG.IO berbahasa Indonesia. " +
    "Buatlah kategori trivia terbuka dengan 24 jawaban faktual yang tersebar merata di 4 tingkat kelangkaan: " +
    "6 jawaban umum (skor 12-32), 7 cukup unik (36-62), 6 langka (66-86), 5 sangat langka (90-99). " +
    "Balas HANYA JSON valid: " +
    '{"title": "Sebutkan ...", "hint": "Petunjuk singkat", "educationalNote": "1 kalimat pengantar edukasi", "answers": [{"name": "...", "score": 15, "fact": "1 kalimat fakta unik"}]}.';

  const userPrompt = `Buat kategori kuis tentang topik: "${topic}" (tema: ${theme}). Pastikan seluruh fakta akurat dan ramah semua umur.`;

  const { model, content } = await callGroqWithFallback(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.35, maxTokens: 2400 }
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
  const now = Date.now();
  return {
    enabled: isEnabled(),
    models: GROQ_MODELS.map((m) => ({
      name: m,
      status: (modelStats[m]?.cooldownUntil || 0) > now ? "cooldown" : "ready",
      cooldownRemainingSec: Math.max(
        0,
        Math.ceil(((modelStats[m]?.cooldownUntil || 0) - now) / 1000)
      ),
      successCount: modelStats[m]?.successCount || 0,
      errorCount: modelStats[m]?.errorCount || 0,
      lastError: modelStats[m]?.lastError || null
    }))
  };
}

module.exports = {
  GROQ_MODELS,
  isEnabled,
  validateAnswerWithAI,
  generateCategoryWithAI,
  getAiStatus
};
