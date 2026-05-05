const els = {
  apiBase: document.querySelector("#apiBase"),
  consumerId: document.querySelector("#consumerId"),
  uploadForm: document.querySelector("#uploadForm"),
  csvFile: document.querySelector("#csvFile"),
  sampleButton: document.querySelector("#sampleButton"),
  refreshButton: document.querySelector("#refreshButton"),
  errorsButton: document.querySelector("#errorsButton"),
  message: document.querySelector("#message"),
  importId: document.querySelector("#importId"),
  statusValue: document.querySelector("#statusValue"),
  processedRows: document.querySelector("#processedRows"),
  importedCount: document.querySelector("#importedCount"),
  errorCount: document.querySelector("#errorCount"),
  fileName: document.querySelector("#fileName"),
  errorsBody: document.querySelector("#errorsBody"),
};

const sampleCsv = `name,email
John,john@test.com
Jane,jane@test.com
Bad,not-an-email
`;

let currentImportId = "";
let pollTimer = 0;

function setMessage(text, isError = false) {
  els.message.textContent = text;
  els.message.classList.toggle("error", isError);
}

function apiUrl(path) {
  return `${els.apiBase.value.replace(/\/$/, "")}${path}`;
}

function headers() {
  return { "x-consumer-id": els.consumerId.value.trim() };
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { ...headers(), ...options.headers },
  });

  if (!response.ok) {
    throw new Error((await response.text()) || `HTTP ${response.status}`);
  }

  return response.json();
}

function setButtons() {
  const hasImport = Boolean(currentImportId);
  els.refreshButton.disabled = !hasImport;
  els.errorsButton.disabled = !hasImport;
}

async function upload(file) {
  const body = new FormData();
  body.append("file", file);

  setMessage(`Uploading ${file.name}...`);
  const result = await request("/imports", { method: "POST", body });
  currentImportId = result.importId;
  els.importId.textContent = currentImportId;
  setButtons();
  await refresh();

  window.clearInterval(pollTimer);
  pollTimer = window.setInterval(refresh, 2500);
}

async function refresh() {
  if (!currentImportId) return;

  const record = await request(`/imports/${currentImportId}`);
  els.importId.textContent = record.id;
  els.statusValue.textContent = record.status;
  els.processedRows.textContent = record.processedRows;
  els.importedCount.textContent = record.importedCount;
  els.errorCount.textContent = record.errorCount;
  els.fileName.textContent = record.fileName;
  setMessage(`Import ${record.status.toLowerCase()}.`);

  if (record.status === "COMPLETED" || record.status === "FAILED") {
    window.clearInterval(pollTimer);
  }
}

async function loadErrors() {
  if (!currentImportId) return;

  const result = await request(`/imports/${currentImportId}/errors?page=1&limit=50`);
  els.errorsBody.replaceChildren();

  if (result.data.length === 0) {
    els.errorsBody.innerHTML = `<tr><td colspan="3">No validation errors.</td></tr>`;
    return;
  }

  for (const error of result.data) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${error.line}</td><td><code></code></td><td></td>`;
    row.children[1].firstChild.textContent = error.data;
    row.children[2].textContent = error.errorMessage;
    els.errorsBody.append(row);
  }
}

els.uploadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const file = els.csvFile.files[0];
  if (!file) {
    setMessage("Choose a CSV file first.", true);
    return;
  }
  upload(file).catch((error) => setMessage(error.message, true));
});

els.sampleButton.addEventListener("click", () => {
  const file = new File([sampleCsv], "sample-import.csv", { type: "text/csv" });
  upload(file).catch((error) => setMessage(error.message, true));
});

els.refreshButton.addEventListener("click", () => {
  refresh().catch((error) => setMessage(error.message, true));
});

els.errorsButton.addEventListener("click", () => {
  loadErrors().catch((error) => setMessage(error.message, true));
});

setButtons();
