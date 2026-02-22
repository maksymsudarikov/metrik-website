const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are Metrik's intake agent. Metrik is an AI adoption consultancy for small and medium businesses — law firms, clinics, cleaning services, painting contractors, accounting practices. Your job is to qualify leads through friendly conversation. Ask what kind of business they run, what manual tasks take up most of their team's time, and what they've tried before. Keep responses short — 2-3 sentences max. After 3-4 exchanges, suggest they book a free audit. Never mention pricing. Never make up specific case studies. Be direct and practical, not salesy.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let messages;
  try {
    ({ messages } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'messages must be a non-empty array' }) };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: response.content[0].text })
    };
  } catch (err) {
    console.error('Anthropic API error:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get response from AI' })
    };
  }
};
