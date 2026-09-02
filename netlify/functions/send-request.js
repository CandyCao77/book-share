const fs = require('fs');
const path = require('path');

// Netlify serverless function to forward a book request to SendGrid.
// Expects environment variable: SENDGRID_API_KEY
// Optional environment variable: FROM_EMAIL

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  const { bookId, bookName, publisher, publisherEmail, requesterName, requesterEmail } = body;

  // Determine recipient email: prefer publisherEmail, fallback to data/givers.json by bookId
  let recipient = publisherEmail || null;

  if (!recipient) {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'givers.json');
      if (fs.existsSync(dataPath)) {
        const givers = JSON.parse(fs.readFileSync(dataPath, 'utf8') || '{}');
        if (givers && givers[bookId]) recipient = givers[bookId];
      }
    } catch (e) {
      // ignore
    }
  }

  if (!recipient) {
    // Not configured to send email; return a success-ish response indicating admin needs to configure
    return { statusCode: 200, body: JSON.stringify({ success: true, reason: 'not_configured' }) };
  }

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'sendgrid_not_configured' }) };
  }

  const fromEmail = process.env.FROM_EMAIL || 'no-reply@' + (process.env.DOMAIN || 'example.com');

  const sgPayload = {
    personalizations: [
      {
        to: [ { email: recipient } ],
        subject: `Your book \"${bookName}\" has a new request`
      }
    ],
    from: { email: fromEmail },
    content: [
      {
        type: 'text/plain',
        value: `Hi ${publisher || ''},\n\n${requesterName} (${requesterEmail}) requested your book "${bookName}".\nPlease contact them to arrange handover.\n\nThanks.`
      }
    ]
  };

  try {
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sgPayload)
    });

    if (resp.ok) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
      const text = await resp.text();
      return { statusCode: 500, body: JSON.stringify({ success: false, error: text }) };
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: String(e) }) };
  }
};