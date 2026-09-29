import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFormSubmission,
  interpretFormSubmitResponse
} from '../form-delivery.mjs';

test('rental requests are submitted to the published River City customer inbox', () => {
  const submission = buildFormSubmission({
    name: 'Form Test',
    phone: '225-555-0100',
    email: 'form-test@example.com',
    parish: 'Ascension Parish',
    start_date: '2026-10-01',
    end_date: '2026-10-08',
    project: 'Automated delivery test'
  });

  assert.equal(
    submission.endpoint,
    'https://formsubmit.co/ajax/rivercityrolloffs@outlook.com'
  );
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
    _subject: 'River City RollOffs rental request',
    _template: 'table',
    _captcha: 'false',
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
