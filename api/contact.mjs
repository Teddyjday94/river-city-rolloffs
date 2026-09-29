const FORM_RECIPIENT = 'rivercityrolloffs@outlook.com';

const text = (value) => String(value ?? '').trim();

function buildEmailMessage(values, domain) {
  const email = text(values.email);

  return {
    from: `River City RollOffs Website <requests@${domain}>`,
    to: [FORM_RECIPIENT],
    subject: 'New River City RollOffs rental request',
    ...(email ? { reply_to: email } : {}),
    text: [
      'New rental request',
      '',
      `Name: ${text(values.name)}`,
      `Phone: ${text(values.phone)}`,
      `Email: ${email || 'Not provided'}`,
      `Parish: ${text(values.parish)}`,
      `Start date: ${text(values.start_date)}`,
      `End date: ${text(values.end_date)}`,
      '',
      'Project details:',
      text(values.project) || 'Not provided'
    ].join('\n')
  };
}

export async function sendResendEmail(message, {
  env = process.env,
  fetchImpl = fetch
} = {}) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || 'Resend rejected the email');
  }

  return payload;
}

export function createContactHandler({
  env = process.env,
  sendEmail = (message) => sendResendEmail(message, { env }),
  logError = console.error
} = {}) {
  return async function contactHandler(request) {
    if (request.method !== 'POST') {
      return Response.json({ success: false }, {
        status: 405,
        headers: { Allow: 'POST' }
      });
    }

    const values = await request.json();
    const requiredFields = ['name', 'phone', 'parish', 'start_date', 'end_date'];

    if (text(values._honey)) {
      return Response.json({ success: true });
    }

    if (requiredFields.some((field) => !text(values[field]))) {
      return Response.json({
        success: false,
        message: 'Please complete all required fields.'
      }, { status: 400 });
    }

    const domain = env.RESEND_EMAIL_DOMAIN || 'rivercityrolloffsla.com';
    try {
      await sendEmail(buildEmailMessage(values, domain));
    } catch (error) {
      logError('Contact email delivery failed', {
        message: error instanceof Error ? error.message : String(error)
      });
      return Response.json({
        success: false,
        message: 'The email service is temporarily unavailable. Please call or text River City RollOffs.'
      }, { status: 502 });
    }

    return Response.json({ success: true });
  };
}

export default {
  fetch: createContactHandler()
};
