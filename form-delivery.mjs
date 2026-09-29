export function buildFormSubmission(values) {
  const text = (value) => String(value ?? '').trim();

  return {
    endpoint: '/api/contact',
    fields: {
      _honey: text(values._honey),
      name: text(values.name),
      phone: text(values.phone),
      email: text(values.email),
      parish: text(values.parish),
      start_date: text(values.start_date),
      end_date: text(values.end_date),
      project: text(values.project)
    }
  };
}

export function interpretFormSubmitResponse(payload) {
  if (payload?.success === true || payload?.success === 'true') {
    return 'Thanks! Your rental request was emailed successfully.';
  }

  throw new Error(payload?.message || 'The email could not be sent. Please call or text River City RollOffs.');
}

export async function sendRentalRequest(values, fetchImpl = fetch) {
  const submission = buildFormSubmission(values);

  const response = await fetchImpl(submission.endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(submission.fields)
  });
  const payload = await response.json();

  if (!response.ok) throw new Error(payload?.message || 'The email service is temporarily unavailable.');
  return interpretFormSubmitResponse(payload);
}
