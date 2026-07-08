
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ALLOWED_INTENTS = [
  "OPEN_TRANSFER",
  "OPEN_MESSAGES",
  "OPEN_VAULT",
  "OPEN_QR",
  "OPEN_SERVICES",
  "OPEN_HISTORY",
  "TRANSFER_INSTANT",
  "SMALL_TALK",
  "UNKNOWN"
];

const SYSTEM_PROMPT = `
Tu es le cerveau vocal de MaliPay.

Tu dois répondre uniquement en JSON valide.

Tu n'as pas le droit de modifier Firebase.
Tu n'as pas le droit de confirmer un transfert.
Tu n'as pas le droit d'envoyer de l'argent.
Tu n'as pas le droit de supprimer des données.
Tu peux seulement demander au JavaScript MaliPay d'ouvrir une interface ou de remplir un formulaire.

Format obligatoire :
{
  "intent": "OPEN_TRANSFER",
  "action": "openModal",
  "target": "transferBox",
  "reply": "D’accord, j’ouvre la fiche de transfert.",
  "data": {}
}

Intentions autorisées :
OPEN_TRANSFER
OPEN_MESSAGES
OPEN_VAULT
OPEN_QR
OPEN_SERVICES
OPEN_HISTORY
TRANSFER_INSTANT
SMALL_TALK
UNKNOWN

Actions autorisées :
openModal
showQR
openServicesPortal
toggleHistory
fillTransferFormOnly
speakOnly
none

Règle transfert :
Si l'utilisateur veut envoyer de l'argent, utilise intent TRANSFER_INSTANT.
Tu peux extraire :
- phone
- amount
- reason
- feePayer : sender ou receiver

Mais tu ne confirmes jamais le transfert.
`;

app.post("/malipay-ai", async (req, res) => {
  try {
    const userText = String(req.body.text || "").trim();

    if (!userText) {
      return res.json({
        intent: "UNKNOWN",
        action: "none",
        target: null,
        reply: "Je n’ai pas bien entendu.",
        data: {}
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText }
      ],
      response_format: { type: "json_object" }
    });

    const raw = completion.choices[0].message.content;
    let ai;

    try {
      ai = JSON.parse(raw);
    } catch (e) {
      ai = {
        intent: "UNKNOWN",
        action: "none",
        target: null,
        reply: "Je n’ai pas compris correctement.",
        data: {}
      };
    }

    if (!ALLOWED_INTENTS.includes(ai.intent)) {
      ai.intent = "UNKNOWN";
      ai.action = "none";
      ai.target = null;
      ai.data = {};
      ai.reply = "Action non autorisée.";
    }

    return res.json(ai);

  } catch (error) {
    console.error("Erreur MaliPay AI:", error);

    return res.status(500).json({
      intent: "UNKNOWN",
      action: "none",
      target: null,
      reply: "Le cerveau MaliPay est momentanément indisponible.",
      data: {}
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ MaliPay AI Server lancé sur le port " + PORT);
});