const el = {
  form: document.getElementById("form"),
  apiBase: document.getElementById("apiBase"),
  consumerId: document.getElementById("consumerId"),
  csvFile: document.getElementById("csvFile"),
  uploadBtn: document.getElementById("uploadBtn"),
  msg: document.getElementById("msg"),
  statusCard: document.getElementById("statusCard"),
  importIdEl: document.getElementById("importIdEl"),
  badge: document.getElementById("badge"),
  processedRows: document.getElementById("processedRows"),
  importedCount: document.getElementById("importedCount"),
  errorCount: document.getElementById("errorCount"),
  fileName: document.getElementById("fileName"),
  errorsCard: document.getElementById("errorsCard"),
  errorsBody: document.getElementById("errorsBody"),
};

let pollTimer = null;
let polling = false;
let currentId = null;

function baseUrl() {
  return el.apiBase.value.trim().replace(/\/$/, "");
}

function reqHeaders() {
  return { "x-consumer-id": el.consumerId.value.trim() };
}

function setMsg(text, isError) {
  el.msg.textContent = text;
  el.msg.className = isError ? "msg error" : "msg";
}

function setBadge(status) {
  el.badge.textContent = status;
  el.badge.className = `badge ${status.toLowerCase()}`;
}

function fmt(n) {
  return n == null ? "—" : Number(n).toLocaleString();
}

function applyStatus(rec) {
  el.importIdEl.textContent = rec.id;
  el.fileName.textContent = rec.fileName || "";
  el.processedRows.textContent = fmt(rec.processedRows);
  el.importedCount.textContent = fmt(rec.importedCount);
  el.errorCount.textContent = fmt(rec.errorCount);
  setBadge(rec.status);
}

async function apiFetch(path, opts) {
  const res = await fetch(baseUrl() + path, {
    ...opts,
    headers: { ...reqHeaders(), ...opts?.headers },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
}

function stopPoll() {
  clearInterval(pollTimer);
  pollTimer = null;
}

async function fetchErrors() {
  const res = await apiFetch(`/imports/${currentId}/errors?page=1&limit=50`);
  if (!res.data?.length) return;

  el.errorsBody.replaceChildren();
  for (const err of res.data) {
    const tr = el.errorsBody.insertRow();
    tr.insertCell().textContent = err.line;
    tr.insertCell().textContent = err.data;
    tr.insertCell().textContent = err.errorMessage;
  }
  el.errorsCard.classList.remove("hidden");
}

async function poll() {
  if (polling) return;
  polling = true;
  try {
    const rec = await apiFetch(`/imports/${currentId}`);
    applyStatus(rec);

    if (rec.status === "COMPLETED" || rec.status === "FAILED") {
      stopPoll();
      el.uploadBtn.disabled = false;
      setMsg(
        rec.status === "COMPLETED" ? "Import complete." : "Import failed.",
      );
      if (rec.errorCount > 0) await fetchErrors();
    }
  } catch (err) {
    stopPoll();
    el.uploadBtn.disabled = false;
    setMsg(err.message, true);
  } finally {
    polling = false;
  }
}

el.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = el.csvFile.files[0];
  if (!file) {
    setMsg("Select a CSV file first.", true);
    return;
  }

  stopPoll();
  polling = false;
  el.errorsCard.classList.add("hidden");
  el.errorsBody.replaceChildren();
  el.uploadBtn.disabled = true;
  setMsg("Uploading…");

  try {
    const body = new FormData();
    body.append("file", file);
    const data = await apiFetch("/imports", { method: "POST", body });
    currentId = data.importId;

    el.importIdEl.textContent = currentId;
    el.fileName.textContent = file.name;
    el.processedRows.textContent = "0";
    el.importedCount.textContent = "0";
    el.errorCount.textContent = "0";
    setBadge("PENDING");
    el.statusCard.classList.remove("hidden");
    setMsg("Processing…");

    pollTimer = setInterval(poll, 2000);
    poll();
  } catch (err) {
    setMsg(err.message, true);
    el.uploadBtn.disabled = false;
  }
});
