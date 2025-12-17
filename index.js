import express from "express";
import cors from "cors";
import axios from "axios";
import { generateReply } from "./llmService.js";
import dotenv from "dotenv";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import util from 'util';
import summarizeChatBody from "./util.js";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
});
morgan.token("time", () => new Date().toISOString());

/* Request ID */
morgan.token("req-id", (req) => req.id);

/* Real IP */
morgan.token(
  "real-ip",
  (req) => req.headers["x-forwarded-for"] || req.socket.remoteAddress
);

/* Request body (safe) */
morgan.token("req-body", (req) => {
  if (!req.body) return "-";

  const clone = { ...req.body };
  ["password", "token", "accessToken"].forEach((k) => {
    if (clone[k]) clone[k] = "[FILTERED]";
  });

  return JSON.stringify(clone);
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan((tokens, req, res) => {
    const body = req.body
      ? util.inspect(req.body, { depth: null, colors: true })
      : "-";

    return `
      ────────────────────────────────────────────
      🕒 ${new Date().toISOString().replace("T", " ").split(".")[0]}
      🆔 RequestId : ${req.id}
      🌐 IP        : ${tokens["real-ip"](req, res)}
      📥 ${tokens.method(req, res)} ${tokens.url(req, res)}
      📤 Status    : ${tokens.status(req, res)} (${tokens["response-time"](
            req,
            res
          )} ms)
      📦 Length    : ${tokens.res(req, res, "content-length")}
      🔗 Referrer  : ${tokens.referrer(req, res)}
      🖥  Agent    : ${tokens["user-agent"](req, res)}
      📝 Body      :
      ${summarizeChatBody(body)}
      ────────────────────────────────────────────
      `;
  })
);
app.post("/api/dictionary", async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: "Missing word" });

    const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

    const dictRes = await axios.get(dictUrl);
    const entry = dictRes.data?.[0];

    // Extract dictionary info
    const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || null;
    const audio = entry.phonetics?.find((p) => p.audio)?.audio || null;

    const meanings =
      entry.meanings?.map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.map((d) => ({
          definition: d.definition,
          example: d.example || null,
        })),
      })) || [];

    // Also translate to Vietnamese
    const translateRes = await axios.get(
      "https://api.mymemory.translated.net/get",
      {
        params: { q: word, langpair: `en|vi` },
      }
    );

    const translated = translateRes.data?.responseData?.translatedText || "";

    res.json({
      word,
      phonetic,
      audio,
      translated,
      meanings,
    });
  } catch (err) {
    console.error("Dictionary error:", err);
    res.status(500).json({ error: "Lookup failed", detail: err.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  try {
    const reply = await generateReply(message);
    res.json({ reply });
  } catch (err) {
    console.error("LLM error:", err);
    res.status(500).json({ reply: "Sorry, I had trouble thinking." });
  }
});

// ✅ Kiểm tra server
app.get("/", (_, res) => {
  res.send("Dictionary API running 🚀");
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
