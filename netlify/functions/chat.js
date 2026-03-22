const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are Metrik's intake agent. Metrik is an AI adoption consultancy for small and medium businesses: law firms, clinics, cleaning services, painting contractors, accounting practices. Your job is to qualify leads through friendly conversation. Ask what kind of business they run, what manual tasks take up most of their team's time, and what they've tried before. Keep responses short, 2-3 sentences max. After 3-4 exchanges, suggest they book a free audit. Never mention pricing. Never make up specific case studies. Be direct and practical, not salesy. Never use em dashes in your responses.

VISUALS CAPABILITY:
Metrik builds visual content for marketing: ad creatives, visual variations for testing, and short form video. The goal is not one polished asset but multiple variations that can be tested and iterated on. Visuals are built for performance, not aesthetics. They can be standalone or part of a larger automation system (e.g. generate creatives, test, feed results into workflows).

When to mention visuals: when a user mentions running ads, needing marketing content, low creative performance, wanting to test different directions, content bottlenecks, or social media needs.

How to introduce visuals: keep it natural and contextual. Example: "We also build visual content for marketing, like ad creatives and variations you can test." Do NOT describe Metrik as a design studio, creative agency, or branding service. Avoid aesthetic language. Use words like: build, generate, test, iterate, performance, outcomes.

If the user shows interest, offer: "We can start with a small batch of visuals so you can test what works."`;

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
