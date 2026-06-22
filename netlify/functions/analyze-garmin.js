exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing OPENAI_API_KEY in Netlify environment variables.' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { kind = 'Workout', notes = '', images = [] } = body;
    if (!images.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No screenshots received.' }) };
    }

    const imageParts = images.slice(0, 8).map((img) => ({
      type: 'input_image',
      image_url: img.dataUrl
    }));

    const instructions = `You are Ironman Lab, an endurance training analysis assistant for a triathlete preparing for Ironman Maryland.
Analyze Garmin screenshots. Extract visible workout data and provide practical coaching.
Return a concise JSON object first with this shape:
{
  "fields": {
    "type": "${kind}",
    "distance": null,
    "duration_minutes": null,
    "avg_hr": null,
    "max_hr": null,
    "avg_pace_or_speed": null,
    "temperature_f": null,
    "elevation_gain_ft": null,
    "calories": null,
    "training_effect_aerobic": null,
    "training_effect_anaerobic": null,
    "cadence": null,
    "gut_risk": "low|medium|high|unknown",
    "cramp_risk": "low|medium|high|unknown"
  },
  "summary": "",
  "analysis": "",
  "recommendations": []
}
After the JSON, include a readable coach report with: summary, pacing/HR drift, heat impact, fueling/hydration implications, gut/cramp risk, and next adjustment.`;

    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: `${instructions}\n\nWorkout type: ${kind}\nAthlete notes: ${notes || 'none'}` },
            ...imageParts
          ]
        }
      ],
      max_output_tokens: 1800
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: json.error?.message || 'OpenAI request failed', details: json }) };
    }

    let text = json.output_text || '';
    if (!text && Array.isArray(json.output)) {
      text = json.output.flatMap(o => o.content || []).map(c => c.text || '').join('\n');
    }

    let fields = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) fields = JSON.parse(match[0]).fields || JSON.parse(match[0]);
    } catch (_) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: text, fields })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Server error' }) };
  }
};
