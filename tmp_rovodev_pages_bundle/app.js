async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function setStatus(el, payload) {
  el.textContent = JSON.stringify(payload, null, 2);
}

async function verify() {
  const licenseKeyEl = document.getElementById('licenseKey');
  const statusEl = document.getElementById('verifyStatus');
  const stepConnect = document.getElementById('step-connect');
  const connectBtn = document.getElementById('connectNotionBtn');
  const notionStatusEl = document.getElementById('notionStatus');

  const licenseKey = (licenseKeyEl.value || '').trim();
  if (!licenseKey) {
    setStatus(statusEl, { ok: false, error: 'Missing license key' });
    return;
  }

  setStatus(statusEl, { ok: true, status: 'Verifying...' });
  const result = await postJson('/api/verify', { licenseKey });

  if (result.ok && result.json && result.json.valid) {
    localStorage.setItem('gg_licenseKey', licenseKey);
    setStatus(statusEl, { ok: true, valid: true });
    stepConnect.style.display = 'block';

    // Enable Notion connect button
    connectBtn.disabled = false;
    connectBtn.onclick = () => {
      window.location.href = '/api/notion/oauth/start';
    };

    // Poll status to enable generation
    const poll = async () => window.pollNotionStatus(notionStatusEl);
    poll();
    setInterval(poll, 2000);
  } else {
    const reason = result.json?.reason || 'unknown';
    const messages = {
      missing_license_key: 'Please paste your Gumroad license key.',
      missing_env: 'Server configuration error. Please contact support.',
      invalid: 'Invalid license key. Double-check your Gumroad receipt email.',
      refunded: 'This purchase has been refunded, so the license key is no longer valid.',
      chargebacked: 'This purchase has been charged back, so the license key is no longer valid.',
      used: 'This license key has already been redeemed.',
      gumroad_error: 'Could not verify your license key right now. Please try again.',
      unknown: 'Verification failed. Please try again.',
    };

    setStatus(statusEl, {
      ok: false,
      status: result.status,
      valid: false,
      reason,
      message: result.json?.message || messages[reason] || messages.unknown,
    });
  }
}

async function generate() {
  const statusEl = document.getElementById('generateStatus');
  const licenseKey = localStorage.getItem('gg_licenseKey');
  if (!licenseKey) {
    setStatus(statusEl, { ok: false, error: 'missing_license_key' });
    return;
  }

  setStatus(statusEl, { ok: true, status: 'Generating...' });
  const result = await postJson('/api/generate', { licenseKey, templateType: 'NOTION_TEMPLATES' });
  setStatus(statusEl, result);
}

document.addEventListener('DOMContentLoaded', () => {
  const verifyBtn = document.getElementById('verifyBtn');
  verifyBtn.addEventListener('click', verify);

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.addEventListener('click', generate);
});
