import assert from 'node:assert/strict';
import test from 'node:test';

const contactApi = await import('../api/contact.mjs').catch(() => ({ default: null }));

test('the contact API exposes a Vercel Web Handler', () => {
  assert.equal(typeof contactApi.default?.fetch, 'function');
});

test('the contact API exposes a testable handler factory', () => {
  assert.equal(typeof contactApi.createContactHandler, 'function');
});

const validSubmission = {
  _honey: '',
  name: 'Jane Customer',
  phone: '225-555-0100',
  email: 'jane@example.com',
  parish: 'Ascension Parish',
  start_date: '2026-10-01',
  end_date: '2026-10-08',
  project: 'Garage cleanout'
};

test('a valid rental request is emailed to the River City customer inbox', async () => {
  const deliveries = [];
  const handler = contactApi.createContactHandler({
    env: { RESEND_EMAIL_DOMAIN: 'rivercityrolloffsla.com' },
    sendEmail: async (message) => {
      deliveries.push(message);
      return { id: 'email_123' };
    }
  });
  const request = new Request('https://rivercityrolloffsla.com/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://rivercityrolloffsla.com'
    },
    body: JSON.stringify(validSubmission)
  });

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.deepEqual(deliveries, [{
    from: 'River City RollOffs Website <requests@rivercityrolloffsla.com>',
    to: ['rivercityrolloffs@outlook.com'],
    subject: 'New River City RollOffs rental request',
    reply_to: 'jane@example.com',
    text: [
      'New rental request',
      '',
      'Name: Jane Customer',
      'Phone: 225-555-0100',
      'Email: jane@example.com',
      'Parish: Ascension Parish',
      'Start date: 2026-10-01',
      'End date: 2026-10-08',
      '',
      'Project details:',
      'Garage cleanout'
    ].join('\n')
  }]);
});

test('an incomplete rental request is rejected without sending email', async () => {
  let deliveryCount = 0;
  const handler = contactApi.createContactHandler({
    env: { RESEND_EMAIL_DOMAIN: 'rivercityrolloffsla.com' },
    sendEmail: async () => {
      deliveryCount += 1;
    }
  });
  const request = new Request('https://rivercityrolloffsla.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validSubmission, phone: '' })
  });

  const response = await handler(request);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Please complete all required fields.'
  });
  assert.equal(deliveryCount, 0);
});

test('a honeypot submission returns success without sending email', async () => {
  let deliveryCount = 0;
  const handler = contactApi.createContactHandler({
    env: { RESEND_EMAIL_DOMAIN: 'rivercityrolloffsla.com' },
    sendEmail: async () => {
      deliveryCount += 1;
    }
  });
  const request = new Request('https://rivercityrolloffsla.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validSubmission, _honey: 'bot value' })
  });

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(deliveryCount, 0);
});

test('an email provider failure returns a safe customer-facing error', async () => {
  const handler = contactApi.createContactHandler({
    env: { RESEND_EMAIL_DOMAIN: 'rivercityrolloffsla.com' },
    sendEmail: async () => {
      throw new Error('provider detail that must not reach the browser');
    },
    logError: () => {}
  });
  const request = new Request('https://rivercityrolloffsla.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validSubmission)
  });

  const response = await handler(request);

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'The email service is temporarily unavailable. Please call or text River City RollOffs.'
  });
});

test('the contact API rejects non-POST requests', async () => {
  const handler = contactApi.createContactHandler({ sendEmail: async () => {} });
  const request = new Request('https://rivercityrolloffsla.com/api/contact');

  const response = await handler(request);

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
});

test('an optional blank email address is omitted from the Resend payload', async () => {
  let delivery;
  const handler = contactApi.createContactHandler({
    env: { RESEND_EMAIL_DOMAIN: 'rivercityrolloffsla.com' },
    sendEmail: async (message) => {
      delivery = message;
      return { id: 'email_456' };
    }
  });
  const request = new Request('https://rivercityrolloffsla.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validSubmission, email: '' })
  });

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.equal('reply_to' in delivery, false);
});
