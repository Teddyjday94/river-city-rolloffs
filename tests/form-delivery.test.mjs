import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFormSubmission,
  interpretFormSubmitResponse,
  sendRentalRequest
} from '../form-delivery.mjs';

const requestValues = {
  _honey: '',
  name: 'Form Test',
  phone: '225-555-0100',
  email: 'form-test@example.com',
  parish: 'Ascension Parish',
  start_date: '2026-10-01',
  end_date: '2026-10-08',
  project: 'Automated delivery test'
};

test('rental requests are submitted to the same-domain email API', () => {
  const submission = buildFormSubmission({
    ...requestValues
  });

  assert.equal(submission.endpoint, '/api/contact');
});

test('rental request fields are normalized for the email delivery service', () => {
  const submission = buildFormSubmission({
    _honey: '  ',
    name: '  Jane Customer  ',
    phone: ' 225-555-0100 ',
    email: ' jane@example.com ',
    parish: ' Ascension Parish ',
    start_date: ' 2026-10-01 ',
    end_date: ' 2026-10-08 ',
    project: ' Garage cleanout '
  });

  assert.deepEqual(submission.fields, {
    _honey: '',
    name: 'Jane Customer',
    phone: '225-555-0100',
    email: 'jane@example.com',
    parish: 'Ascension Parish',
    start_date: '2026-10-01',
    end_date: '2026-10-08',
    project: 'Garage cleanout'
  });
});

test('rental requests are posted as JSON to the email API', async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  await sendRentalRequest(requestValues, fetchImpl);

  assert.equal(captured.url, '/api/contact');
  assert.deepEqual(captured.options.headers, {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  });
  assert.deepEqual(JSON.parse(captured.options.body), requestValues);
});

test('successful delivery responses return the customer-facing confirmation', () => {
  assert.equal(
    interpretFormSubmitResponse({ success: true }),
    'Thanks! Your rental request was emailed successfully.'
  );
});

test('failed delivery responses preserve the provider error message', () => {
  assert.throws(
    () => interpretFormSubmitResponse({ success: false, message: 'Delivery rejected' }),
    /Delivery rejected/
  );
});
