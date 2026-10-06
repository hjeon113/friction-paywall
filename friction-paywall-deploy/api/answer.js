// Vercel serverless function (Node.js).
//
// This is the piece that GitHub Pages alone cannot do: it holds the
// Gemini API key server-side and calls the real model on the
// participant's behalf. The browser never sees the key — it only
// talks to this endpoint.
//
// Required in the Vercel project's Settings -> Environment Variables:
//   GEMINI_API_KEY   your free key from aistudio.google.com/apikey
// Optional:
//   GEMINI_MODEL      defaults to gemini-2.5-flash below. Override
//                      here if you want a different model.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Set it in the Vercel project settings.' });
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

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  try {
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      const message = (data && data.error && data.error.message) || ('Upstream error (' + upstream.status + ')');
      res.status(upstream.status).json({ error: message });
      return;
    }

    const text = (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) || '';
    res.status(200).json({ text: text });
  } catch (err) {
    res.status(500).json({ error: 'Could not reach the answer service.' });
  }
};
