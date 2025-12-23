window.pollNotionStatus = async function pollNotionStatus(notionStatusEl) {
  try {
    const res = await fetch('/api/notion/status');
    const j = await res.json();
    notionStatusEl.textContent = JSON.stringify(j, null, 2);
    if (j.connected) {
      document.getElementById('step-generate').style.display = 'block';
      document.getElementById('generateBtn').disabled = false;
    }
  } catch (e) {
    notionStatusEl.textContent = JSON.stringify({ connected: false, error: String(e) }, null, 2);
  }
}
