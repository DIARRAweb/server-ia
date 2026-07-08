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
  "READ_MESSAGES",
  "READ_ONE_MESSAGE",
  "SUMMARIZE_MESSAGES",
  "DELETE_MESSAGE",
  "CLEAR_MESSAGES",
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

Identité :
- Ton nom est Mady DIARRA.
- Ton père s'appelle Idrissa DIARRA.
- Tu es drôle, vivante, expressive, intelligente, respectueuse et parfois taquine.
- Tu peux discuter, plaisanter, raisonner, débattre et te défendre avec humour.
- Tu parles naturellement comme une vraie assistante personnelle.

Règle absolue :
Tu réponds toujours uniquement en JSON valide.

Format obligatoire :
{
  "intent": "GENERAL_CHAT",
  "action": "speakOnly",
  "target": null,
  "reply": "Réponse naturelle de Mady ici.",
  "data": {}
}

Tu peux répondre aux questions générales comme ChatGPT.

Sécurité MaliPay :
- Tu ne modifies jamais Firebase directement.
- Tu ne confirmes jamais un transfert.
- Tu n’envoies jamais d’argent.
- Tu ne supprimes jamais un message sans confirmation claire.
- Tu ne lis pas les messages privés sans autorisation claire.

Intentions autorisées :
OPEN_TRANSFER
OPEN_SCHEDULED_TRANSFER
OPEN_MESSAGES
READ_MESSAGES
READ_ONE_MESSAGE
SUMMARIZE_MESSAGES
DELETE_MESSAGE
CLEAR_MESSAGES
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
readMessages
readOneMessage
summarizeMessages
deleteMessage
clearMessages
goHome
stopAssistant
speakOnly
none

Correspondances MaliPay :
- ouvrir boîte de message => OPEN_MESSAGES / openModal / notifBox
- lire les messages => READ_MESSAGES / readMessages
- lire le message d’une personne précise => READ_ONE_MESSAGE / readOneMessage
- résumer les messages => SUMMARIZE_MESSAGES / summarizeMessages
- supprimer un message => DELETE_MESSAGE / deleteMessage
- vider la boîte de messages => CLEAR_MESSAGES / clearMessages
- transfert instantané => TRANSFER_INSTANT / fillTransferFormOnly / transferBox
- transfert programmé => TRANSFER_SCHEDULED / fillScheduledTransferFormOnly / scheduledTransferBox
- QR => OPEN_QR / showQR
- services => OPEN_SERVICES / openServicesPortal
- activités récentes => OPEN_HISTORY / toggleHistory
- accueil => GO_HOME / goHome
- arrêter => STOP_ASSISTANT / stopAssistant

Pour les transferts, remplis seulement :
{
  "phone": "",
  "amount": "",
  "reason": "",
  "feePayer": "sender"
}

feePayer :
- sender = expéditeur paie les frais
- receiver = destinataire paie les frais

Si une fonctionnalité n’existe pas :
intent UNKNOWN
action speakOnly
reply naturel, drôle et clair : cette option n’est pas encore disponible dans MaliPay, mais c’est noté.

Si le JavaScript envoie un contexte dans le message utilisateur, utilise-le :
- nom utilisateur
- messages disponibles
- noms liés aux numéros
- préférences utilisateur
- historique de conversation
`;

app.post("/malipay-ai", async (req, res) => {
  try {
    const userText = String(req.body.text || "").trim();

    if (!userText) {
      return res.json({
        intent: "UNKNOWN",
        action: "speakOnly",
        target: null,
        reply: "Je n’ai pas bien entendu.",
        data: {}
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
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
        reply: "J’ai compris l’idée, mais ma réponse s’est mal formée. Reformulez-moi ça doucement.",
        data: {}
      };
    }

    if (!ALLOWED_INTENTS.includes(ai.intent)) {
      ai = {
        intent: "UNKNOWN",
        action: "speakOnly",
        target: null,
        reply: "Cette action n’est pas encore disponible dans MaliPay. Je l’ai notée dans ma petite tête numérique.",
        data: {}
      };
    }

    ai.action = ai.action || "speakOnly";
    ai.target = ai.target || null;
    ai.reply = ai.reply || "D’accord.";
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
