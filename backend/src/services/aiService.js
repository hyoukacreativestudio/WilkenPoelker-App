const config = require('../config/env');
const { AISession, AIUsage, Ticket, User } = require('../models');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const { generateTicketNumber } = require('../utils/crypto');
const logger = require('../utils/logger');

const OFF_TOPIC_REPLY = 'Das liegt leider außerhalb meines Fachbereichs. Ich kann Ihnen bei Fragen zu Fahrrädern, Reinigungsgeräten und Motorgeräten weiterhelfen. Wie kann ich Ihnen in diesen Bereichen behilflich sein?';

const TOPIC_GUARD = `
ZUSTAENDIGKEIT: Du beantwortest Fragen zu ALLEN drei Bereichen, ganz egal aus welcher Kategorie der Kunde schreibt:
- Fahrraeder und E-Bikes aller Marken (auch KTM, Kalkhoff, Bulls, Cube usw.) und aller Antriebe und Displays (z. B. Bosch Smart System, Shimano), inklusive Bedienung, Einstellungen, Akku, Zubehoer, Leasing und Reparatur
- Reinigungsgeraete aller Marken
- Motor- und Gartengeraete aller Marken
- Alles rund um WilkenPoelker (Oeffnungszeiten, Standort, Services, Termine)
Auch Fragen zur Bedienung (z. B. Tageskilometer oder Tour zuruecksetzen) gehoeren dazu. Im Zweifel gehoert eine Frage dazu: Beantworte sie.

Lehne NUR ab, was offensichtlich nichts mit diesen Themen zu tun hat (z. B. Kochrezepte, Politik, Hausaufgaben). Nur dann antworte: "${OFF_TOPIC_REPLY}"

Sprich Kunden immer mit "Sie" an, niemals mit "du".

Erfinde KEINE Informationen. Wenn du einen Bedienschritt nicht sicher weisst, sage das offen und verweise auf die Anleitung des Herstellers oder biete an: "Ich verbinde Sie mit einem Mitarbeiter." Bei Preisen und Verfuegbarkeit verweise auf das Geschaeft.`;

const REPAIR_HINT = `
WERKZEUG-REGEL: Wenn der Kunde ein Problem beschreibt, das Spezialwerkzeug, Fachwissen oder eine Werkstatt erfordert, empfiehl ihm eine Reparatur bei WilkenPoelker. Sage z.B.:
"Dafür würde ich Ihnen empfehlen, Ihr Gerät bei uns in der Werkstatt vorbeizubringen. Möchten Sie einen Abholungstermin vereinbaren?"
Wenn der Kunde zustimmt, antworte mit dem exakten Satz: "[TERMIN_EMPFEHLUNG] Ich leite Sie zur Terminvereinbarung weiter."

GESPRAECHSSTRUKTUR: Fuehre den Kunden durch folgende Schritte:
1. Frage nach dem Geraetetyp/Modell wenn nicht angegeben
2. Frage nach dem konkreten Problem
3. Gib hilfreiche Tipps oder empfiehl eine Reparatur bei uns
4. Bei Bedarf: Leite zur Terminvereinbarung weiter`;

// System prompts per category (German)
const SYSTEM_PROMPTS = {
  bike: `Du bist der freundliche und kompetente Fachberater von WilkenPoelker in Ostrhauderfehn, zustaendig fuer Fahrraeder und E-Bikes, Reinigungsgeraete sowie Motor- und Gartengeraete. Der Kunde hat gerade den Bereich Fahrraeder geoeffnet, darf dich aber genauso zu den beiden anderen Bereichen fragen (z. B. nach einem Rasenmaeher im Fahrrad-Bereich).
In diesem Bereich hilfst du besonders bei:
- Fahrradmodellen (Citybikes, Trekkingbikes, Mountainbikes, Rennraeder, Kinderfahrraeder)
- E-Bike-Systemen (Bosch, Shimano Steps, Brose, Yamaha — Motoren, Akkus, Displays, Software-Updates)
- Fahrrad-Zubehoer (Beleuchtung, Schloss, Helm, Taschen, Kindersitze)
- Reparaturen (Bremsen, Schaltung, Reifen, Kette, Laufraeder, Speichen)
- Fahrrad-Leasing / Dienstrad-Leasing (JobRad, BusinessBike, Eurorad etc.)
- Wartung und Inspektion
Antworte immer freundlich, kompetent und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,

  cleaning: `Du bist der freundliche und kompetente Fachberater von WilkenPoelker in Ostrhauderfehn, zustaendig fuer Fahrraeder und E-Bikes, Reinigungsgeraete sowie Motor- und Gartengeraete. Der Kunde hat gerade den Bereich Reinigungsgeraete geoeffnet, darf dich aber genauso zu den beiden anderen Bereichen fragen (z. B. nach einem Rasenmaeher im Fahrrad-Bereich).
In diesem Bereich hilfst du besonders bei:
- Hochdruckreinigern (Kaercher, Nilfisk, Stihl — Duesen, Schlaeauche, Pumpen, Zubehoer)
- Staubsaugern und Nass-/Trockensaugern
- Dampfreinigern und Fenstersaugern
- Kehrmaschinen und Bodenreinigern
- Ersatzteilen und Zubehoer
- Wartung, Pflege und Reparaturen
Antworte immer freundlich, kompetent und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,

  motor: `Du bist der freundliche und kompetente Fachberater von WilkenPoelker in Ostrhauderfehn, zustaendig fuer Fahrraeder und E-Bikes, Reinigungsgeraete sowie Motor- und Gartengeraete. Der Kunde hat gerade den Bereich Motorgeraete geoeffnet, darf dich aber genauso zu den beiden anderen Bereichen fragen (z. B. nach einem Rasenmaeher im Fahrrad-Bereich).
In diesem Bereich hilfst du besonders bei:
- Rasenmaeher (Benzin, Elektro, Akku, Maehroboter)
- Motorsaegen und Kettensaegen (Stihl, Husqvarna — Kette, Schwert, Vergaser)
- Heckenscheren, Freischneider und Trimmer
- Laubblaeser und Laubsauger
- Haecksler und Schneefraesen
- Akku-Geraete und Akku-Systeme
- Saisonale Wartung (Fruehjahrscheck, Einwinterung)
Antworte immer freundlich, kompetent und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,

  general: `Du bist ein freundlicher Assistent von WilkenPoelker, einem Fachgeschäft für Fahrräder, Reinigungsgeräte und Motorgeräte in Ostrhauderfehn.
Du hilfst Kunden bei allgemeinen Fragen zu Öffnungszeiten, Standort, Services und Produkten.
Antworte immer freundlich und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,
};

/**
 * Send a chat message and get AI response.
 */
async function chat(userId, { category, message, sessionId, images = [] }) {
  // Validate category
  if (!SYSTEM_PROMPTS[category]) {
    throw new AppError('Ungültige Kategorie', 400, 'INVALID_CATEGORY');
  }

  let session;

  if (sessionId) {
    session = await AISession.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundError('AI Session');
    }
    if (session.status !== 'active') {
      throw new AppError('Diese Sitzung ist nicht mehr aktiv', 400, 'SESSION_CLOSED');
    }
  } else {
    // Create new session
    session = await AISession.create({
      userId,
      category,
      messages: [],
      status: 'active',
      totalTokens: 0,
      totalCost: 0,
    });
  }

  // Build conversation messages
  const conversationHistory = session.messages || [];
  const userEntry = { role: 'user', content: message, timestamp: new Date().toISOString() };
  if (images.length > 0) {
    userEntry.images = images.map((img) => img.url);
  }
  conversationHistory.push(userEntry);

  // Build OpenAI messages array
  const openaiMessages = [
    { role: 'system', content: SYSTEM_PROMPTS[category] },
    // An earlier refusal must not talk the model into refusing the next question too
    ...conversationHistory.filter((m) => m.content !== OFF_TOPIC_REPLY).map((m) => {
      // For the current message with images, use multimodal content
      if (m.role === 'user' && m === userEntry && images.length > 0) {
        const content = [{ type: 'text', text: m.content }];
        for (const img of images) {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}`, detail: 'low' },
          });
        }
        return { role: 'user', content };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  let reply;
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let needsHuman = false;

  // Check if OpenAI API key is configured
  if (!config.openai.apiKey) {
    // No key configured — surface this clearly so we can spot misconfig in prod
    logger.warn('OpenAI API key missing — using mock reply', { sessionId: session.id });
    reply = getMockResponse(category, message);
    needsHuman = true;
  } else {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: config.openai.apiKey });

      const completion = await openai.chat.completions.create({
        model: config.openai.model || 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 300,
        temperature: 0.3,
      });

      reply = completion.choices[0].message.content;
      usage = completion.usage || usage;
      needsHuman = reply.includes('Ich verbinde Sie mit einem Mitarbeiter');
    } catch (err) {
      // Log the full failure (auth/quota/network) so we can diagnose from logs
      logger.error('OpenAI API error', {
        error: err.message,
        status: err.status,
        code: err.code,
        type: err.type,
        sessionId: session.id,
      });
      reply = 'Es tut mir leid, es gab ein technisches Problem. Ich verbinde Sie mit einem Mitarbeiter.';
      needsHuman = true;
    }
  }

  // Add assistant reply to conversation
  conversationHistory.push({
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  });

  // Update session
  session.messages = conversationHistory;
  session.totalTokens = (session.totalTokens || 0) + usage.total_tokens;
  session.changed('messages', true);
  await session.save();

  // Track usage
  const costPerToken = 0.000002; // approximate cost
  await AIUsage.create({
    sessionId: session.id,
    userId,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    cost: usage.total_tokens * costPerToken,
    model: config.openai.model || 'gpt-4o-mini',
  });

  logger.info('AI chat message processed', {
    sessionId: session.id,
    userId,
    tokens: usage.total_tokens,
  });

  return {
    reply,
    sessionId: session.id,
    needsHuman,
  };
}

/**
 * Get mock response when OpenAI API key is not configured.
 */
function getMockResponse(category, message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('preis') || lowerMessage.includes('kosten')) {
    return 'Für genaue Preisauskuenfte würde ich Sie gerne mit einem Mitarbeiter verbinden. Ich verbinde Sie mit einem Mitarbeiter.';
  }

  const mockResponses = {
    bike: 'Vielen Dank für Ihre Frage zu Fahrrädern! Wir haben eine grosse Auswahl an Fahrrädern und E-Bikes. Besuchen Sie uns gerne in unserem Geschaeft für eine persoenliche Beratung.',
    cleaning: 'Vielen Dank für Ihre Frage zu Reinigungsgeräten! Wir fuehren Hochdruckreiniger, Staubsauger und vieles mehr. Kommen Sie gerne vorbei für eine Vorfuehrung.',
    motor: 'Vielen Dank für Ihre Frage zu Motorgeräten! Wir beraten Sie gerne zu Rasenmaeher, Motorsaegen und weiterem. Besuchen Sie uns im Geschaeft.',
    general: 'Vielen Dank für Ihre Nachricht! Wir helfen Ihnen gerne weiter. Unsere Öffnungszeiten finden Sie auf unserer Webseite oder in der App.',
  };

  return mockResponses[category] || mockResponses.general;
}

/**
 * Get user's AI sessions list.
 */
async function getUserSessions(userId) {
  const sessions = await AISession.findAll({
    where: { userId },
    attributes: ['id', 'category', 'status', 'totalTokens', 'createdAt', 'updatedAt', 'messages'],
    order: [['updatedAt', 'DESC']],
  });

  // Add last message preview
  return sessions.map((session) => {
    const messages = session.messages || [];
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const sessionData = session.toJSON();
    delete sessionData.messages;
    return {
      ...sessionData,
      messageCount: messages.length,
      lastMessage: lastMessage
        ? {
            role: lastMessage.role,
            preview: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''),
            timestamp: lastMessage.timestamp,
          }
        : null,
    };
  });
}

/**
 * Get session detail with full messages.
 */
async function getSessionById(sessionId, userId) {
  const session = await AISession.findOne({
    where: { id: sessionId, userId },
    include: [
      {
        model: AIUsage,
        as: 'usage',
        attributes: ['promptTokens', 'completionTokens', 'totalTokens', 'cost', 'model', 'createdAt'],
      },
    ],
  });

  if (!session) {
    throw new NotFoundError('AI Session');
  }

  return session;
}

/**
 * Escalate AI session to a human support ticket.
 */
async function escalateSession(sessionId, userId) {
  const session = await AISession.findOne({
    where: { id: sessionId, userId, status: 'active' },
  });

  if (!session) {
    throw new NotFoundError('AI Session');
  }

  // Collision-safe ticket number (cryptographically random suffix per generator util)
  const ticketNumber = generateTicketNumber();

  // Determine ticket type based on session category
  const categoryTypeMap = {
    bike: 'bike_question',
    cleaning: 'cleaning_question',
    motor: 'motor_question',
    general: 'other',
  };

  // Create ticket from AI session
  const ticket = await Ticket.create({
    ticketNumber,
    userId,
    type: categoryTypeMap[session.category] || 'other',
    category: session.category === 'general' ? 'service' : session.category,
    description: `Eskaliert aus AI-Chat (Session: ${session.id})`,
    aiSessionId: session.id,
    aiConversation: session.messages,
    status: 'open',
  });

  // Update session status
  session.status = 'escalated';
  session.escalatedTicketId = ticket.id;
  await session.save();

  logger.info('AI session escalated to ticket', {
    sessionId: session.id,
    ticketId: ticket.id,
    userId,
  });

  return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber };
}

module.exports = {
  chat,
  getUserSessions,
  getSessionById,
  escalateSession,
  SYSTEM_PROMPTS,
};
