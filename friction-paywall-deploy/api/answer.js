// Vercel serverless function (Node.js).
//
// This is the piece that GitHub Pages alone cannot do: it holds the
// Anthropic API key server-side and calls the real model on the
// participant's behalf. The browser never sees the key — it only
// talks to this endpoint.
//
// Required in the Vercel project's Settings -> Environment Variables:
//   ANTHROPIC_API_KEY   your key from console.anthropic.com
// Optional:
//   ANTHROPIC_MODEL      defaults to claude-3-5-sonnet-20241022 below.
//                         Check console.anthropic.com for the exact
//                         current model names available to your key
//                         and override here if needed.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Set it in the Vercel project settings.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const prompt = body && body.prompt;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing "prompt" in request body.' });
    return;
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const message = (data && data.error && data.error.message) || ('Upstream error (' + upstream.status + ')');
      res.status(upstream.status).json({ error: message });
      return;
    }

    const text = (data.content && data.content[0] && data.content[0].text) || '';
    res.status(200).json({ text: text });
  } catch (err) {
    res.status(500).json({ error: 'Could not reach the answer service.' });
  }
};
