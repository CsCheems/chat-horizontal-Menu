const $ = (sel) => document.querySelector(sel);

const els = {
    appTitle: $("#appTitle"),
    appSubtitle: $("#appSubtitle"),

    baseUrl: $("#baseUrl"),
    finalUrl: $("#finalUrl"),
    statusPill: $("#statusPill"),
    countPill: $("#countPill"),

    formMount: $("#formMount"),

    copyBtn: $("#copyBtn"),
    openBtn: $("#openBtn"),
    resetBtn: $("#resetBtn"),

    livePreview: $("#livePreview"),
    refreshBtn: $("#refreshBtn"),
    previewFrame: $("#previewFrame")
};

let schema = null;
let state = {}; // values by field.id

function normalizeBaseUrl(url) {
    return (url || "").trim();
}

function toQueryValue(field, value) {
    // Boolean switches -> "true"/"false"
    if (field.type === "switch") return value ? "true" : "false";
    // Everything else -> string
    return String(value ?? "");
}

function buildUrl() {
    const base = normalizeBaseUrl(els.baseUrl.value);

    if (!base) {
        els.finalUrl.value = "";
        els.statusPill.textContent = "Falta URL base";
        els.statusPill.style.background = "rgba(255, 77, 77, 0.16)";
        els.statusPill.style.borderColor = "rgba(255, 77, 77, 0.22)";
        els.countPill.textContent = "0 parametros";
        return "";
    }

    const url = new URL(base, window.location.href);

    let count = 0;

    for (const section of schema.sections) {
        for (const field of section.fields) {
        const v = state[field.id];

        // siempre ponemos el param (para que el URL sea explícito)
        url.searchParams.set(field.param, toQueryValue(field, v));
        count++;
        }
    }

    els.finalUrl.value = url.toString();

    els.statusPill.textContent = "Listo";
    els.statusPill.style.background = "rgba(0, 255, 136, 0.14)";
    els.statusPill.style.borderColor = "rgba(0, 255, 136, 0.20)";

    els.countPill.textContent = `${count} parametros`;

    return url.toString();
}

function refreshPreview(force = false) {
  const final = buildUrl();
  if (!final) return;

  if (!els.livePreview.checked && !force) return;

  const previewUrl = new URL(final);
  previewUrl.searchParams.set("preview", "true");

  els.previewFrame.src = previewUrl.toString();
}


function setDefaultState() {
    state = {};
    for (const section of schema.sections) {
        for (const field of section.fields) {
        state[field.id] = field.default;
        }
    }
}

function renderField(field) {
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("div");
    label.className = "fieldLabel";

    const labelText = document.createElement("span");
    labelText.textContent = field.label;

    const meta = document.createElement("span");
    meta.className = "fieldMeta";
    meta.textContent = field.param;

    label.appendChild(labelText);
    label.appendChild(meta);

    wrap.appendChild(label);

    const controlRow = document.createElement("div");
    controlRow.className = "row";

    let input = null;

    if (field.type === "switch") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!state[field.id];

        const switchLine = document.createElement("label");
        switchLine.className = "switchLine";
        switchLine.appendChild(input);

        const span = document.createElement("span");
        span.textContent = state[field.id] ? "Activado" : "Desactivado";
        switchLine.appendChild(span);

        input.addEventListener("change", () => {
        state[field.id] = input.checked;
        span.textContent = input.checked ? "Activado" : "Desactivado";
        buildUrl();
        refreshPreview();
        });

        controlRow.appendChild(switchLine);
        wrap.appendChild(controlRow);
        return wrap;
    }

    if (field.type === "color") {
        input = document.createElement("input");
        input.className = "input";
        input.type = "color";
        input.value = state[field.id];

        input.addEventListener("input", () => {
        state[field.id] = input.value;
        buildUrl();
        refreshPreview();
        });

        wrap.appendChild(input);
        return wrap;
  }

  if (field.type === "range") {
        const range = document.createElement("input");
        range.type = "range";
        range.className = "range";
        range.min = field.min;
        range.max = field.max;
        range.step = field.step ?? 1;
        range.value = state[field.id];

        const valuePill = document.createElement("span");
        valuePill.className = "pill";
        valuePill.textContent = `${range.value}${field.suffix ?? ""}`;

        range.addEventListener("input", () => {
        state[field.id] = Number(range.value);
        valuePill.textContent = `${range.value}${field.suffix ?? ""}`;
        buildUrl();
        refreshPreview();
        });

        controlRow.appendChild(range);
        controlRow.appendChild(valuePill);
        wrap.appendChild(controlRow);
        return wrap;
  }

  // text / number
  input = document.createElement("input");
  input.className = "input";
  input.type = field.type === "number" ? "number" : "text";
  input.value = state[field.id];

  if (field.placeholder) input.placeholder = field.placeholder;
  if (field.type === "number") {
    if (field.min !== undefined) input.min = String(field.min);
    if (field.max !== undefined) input.max = String(field.max);
    if (field.step !== undefined) input.step = String(field.step);
  }

  input.addEventListener("input", () => {
    state[field.id] =
      field.type === "number" ? Number(input.value) : input.value;

    buildUrl();
    refreshPreview();
  });

  wrap.appendChild(input);
  return wrap;
}

function renderSections() {
  els.formMount.innerHTML = "";

  for (const section of schema.sections) {
    const block = document.createElement("div");
    block.className = "section";

    const head = document.createElement("div");
    head.className = "sectionHead";

    const left = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "sectionTitle";
    title.textContent = section.title;

    const desc = document.createElement("p");
    desc.className = "sectionDesc";
    desc.textContent = section.description ?? "";

    left.appendChild(title);
    left.appendChild(desc);

    head.appendChild(left);

    const body = document.createElement("div");
    body.className = "sectionBody";

    for (const field of section.fields) {
      body.appendChild(renderField(field));
    }

    block.appendChild(head);
    block.appendChild(body);

    els.formMount.appendChild(block);
  }
}

function copyUrl() {
  const val = els.finalUrl.value.trim();
  if (!val) return;

  navigator.clipboard.writeText(val).then(() => {
    els.statusPill.textContent = "Copiado ✅";
    els.statusPill.style.background = "rgba(169,112,255,0.18)";
    els.statusPill.style.borderColor = "rgba(169,112,255,0.26)";
    setTimeout(() => buildUrl(), 900);
  });
}

function openUrl() {
  const val = els.finalUrl.value.trim();
  if (!val) return;
  window.open(val, "_blank", "noopener,noreferrer");
}

function resetAll() {
  setDefaultState();

  // re-render para que el UI se sincronice con state
  renderSections();
  buildUrl();
  refreshPreview(true);
}

async function init() {
  const res = await fetch("./config/config.json", { cache: "no-store" });
  schema = await res.json();

  els.appTitle.textContent = schema.app?.title ?? "Configuración";
  els.appSubtitle.textContent = schema.app?.subtitle ?? "";

  els.baseUrl.placeholder = schema.base?.baseUrlPlaceholder ?? "URL base…";
  els.baseUrl.value = schema.base?.defaultBaseUrl ?? "";

  setDefaultState();
  renderSections();
  buildUrl();

  // preview inicial
  refreshPreview(true);

  // listeners top
  els.copyBtn.addEventListener("click", copyUrl);
  els.openBtn.addEventListener("click", openUrl);
  els.resetBtn.addEventListener("click", resetAll);

  els.baseUrl.addEventListener("input", () => {
    buildUrl();
    refreshPreview();
  });

  els.refreshBtn.addEventListener("click", () => refreshPreview(true));
}

document.addEventListener("DOMContentLoaded", init);
