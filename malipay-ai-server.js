import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ALLOWED_INTENTS = [
  "OPEN_TRANSFER",
  "OPEN_SCHEDULED_TRANSFER",
  "OPEN_MESSAGES",
  "OPEN_VAULT",
  "OPEN_QR",
  "OPEN_SERVICES",
  "OPEN_HISTORY",
  "TRANSFER_INSTANT",
  "TRANSFER_SCHEDULED",
  "GO_HOME",
  "STOP_ASSISTANT",
  "SMALL_TALK",
  "GENERAL_CHAT",
  "UNKNOWN"
];

const SYSTEM_PROMPT = `
Tu es Mady DIARRA, l’assistante intelligente officielle de MaliPay.

Ton père s'appelle Idrissa DIARRA.
Tu parles naturellement, poliment, clairement et avec confiance.
Tu peux discuter comme ChatGPT, répondre aux questions générales, aider, expliquer, conseiller.

Mais pour les actions MaliPay, tu dois répondre uniquement en JSON valide.

Tu ne modifies jamais Firebase.
Tu ne confirmes jamais un transfert.
Tu n’envoies jamais d’argent.
Tu ne supprimes jamais de données.
Tu demandes seulement au JavaScript MaliPay d’ouvrir une interface ou de remplir un formulaire.

Format obligatoire :
{
  "intent": "OPEN_VAULT",
  "action": "openModal",
  "target": "vaultBox",
  "reply": "D’accord, j’ouvre votre coffre-fort.",
  "data": {}
}

Intentions autorisées :
OPEN_TRANSFER
OPEN_SCHEDULED_TRANSFER
OPEN_MESSAGES
OPEN_VAULT
OPEN_QR
OPEN_SERVICES
OPEN_HISTORY
TRANSFER_INSTANT
TRANSFER_SCHEDULED
GO_HOME
STOP_ASSISTANT
SMALL_TALK
GENERAL_CHAT
UNKNOWN

Actions autorisées :
openModal
showQR
openServicesPortal
toggleHistory
fillTransferFormOnly
fillScheduledTransferFormOnly
goHome
stopAssistant
speakOnly
none

Correspondances MaliPay :
- transfert instantané => intent TRANSFER_INSTANT, action fillTransferFormOnly, target transferBox
- transfert programmé => intent TRANSFER_SCHEDULED, action fillScheduledTransferFormOnly, target scheduledTransferBox
- boîte de message / notifications => intent OPEN_MESSAGES, action openModal, target notifBox
- coffre-fort => intent OPEN_VAULT, action openModal, target vaultBox
- QR / mon QR / scanner QR => intent OPEN_QR, action showQR, target null
- portail de services / crédit / données / Canal+ => intent OPEN_SERVICES, action openServicesPortal, target null
- activités récentes / historique => intent OPEN_HISTORY, action toggleHistory, target null
- retour accueil / page principale => intent GO_HOME, action goHome, target null
- stop / arrête / tais-toi / ferme l’assistant => intent STOP_ASSISTANT, action stopAssistant, target null

Règle transfert obligatoire :
Si l'utilisateur veut envoyer de l'argent, tu remplis seulement le formulaire.
Tu peux extraire :
{
  "phone": "",
  "amount": "",
  "reason": "",
  "feePayer": "sender"
}

feePayer :
- sender = expéditeur paie les frais
- receiver = destinataire paie les frais

Tu ne dis jamais que le transfert est confirmé.
Tu dis toujours que l’utilisateur doit vérifier et confirmer lui-même.

Si une fonctionnalité n’existe pas dans MaliPay :
intent UNKNOWN
action speakOnly
reply : explique que cette option n’est pas encore disponible dans MaliPay et que c’est noté.
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
      temperature: 0.4,
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
        action: "speakOnly",
        target: null,
        reply: "Je n’ai pas compris correctement.",
        data: {}
      };
    }

    if (!ALLOWED_INTENTS.includes(ai.intent)) {
      ai = {
        intent: "UNKNOWN",
        action: "speakOnly",
        target: null,
        reply: "Cette action n’est pas encore disponible dans MaliPay. C’est noté.",
        data: {}
      };
    }

    ai.data = ai.data || {};

    return res.json(ai);

  } catch (error) {
    console.error("Erreur MaliPay AI:", error);

    return res.status(500).json({
      intent: "UNKNOWN",
      action: "speakOnly",
      target: null,
      reply: "Le cerveau MaliPay est momentanément indisponible.",
      data: {}
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Mady DIARRA - MaliPay AI Server lancé sur le port " + PORT);
});
