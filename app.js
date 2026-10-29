/* Checklist de protocolos – Caminata 100% CC-101
   App web instalable (PWA). Sin servidor: los datos de cada checklist se guardan en el teléfono (localStorage). */
(function () {
  "use strict";
  const D = window.APP_DATA;
  const KEY = "cc101:v2:";
  const view = document.getElementById("view");
  const $title = document.getElementById("title");
  const $subtitle = document.getElementById("subtitle");
  const $back = document.getElementById("btnBack");
  const SUBS = Object.fromEntries(D.subsistemas.map(s => [s.id, s]));

  // ---------- utilidades ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("No se pudo guardar en el teléfono"); } }
  };
  function toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove("show"), 2600);
  }
  const fmtFecha = iso => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}-${m}-${y}`; };
  const ahora = () => { const d = new Date(), p = n => String(n).padStart(2, "0");
    return { txt: `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`,
             id: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}` }; };

  // ---------- estado por subsistema ----------
  function state(id) {
    const s = store.get(KEY + id, null) || { qa: { planos: "", area: "" }, items: {}, updated: null, validaciones: [] };
    s.validaciones = s.validaciones || [];
    return s;
  }
  function save(id, s) { s.updated = new Date().toISOString(); store.set(KEY + id, s); }
  function itemState(s, it) {
    if (!s.items[it.id]) s.items[it.id] = { aplica: it.aplica, estado: "", folio: "", fecha: "", obs: "" };
    return s.items[it.id];
  }
  function calc(sub, s) {
    const items = D.plantillas[sub.plantilla].items;
    // Misma lógica que el RESUMEN de la planilla Excel
    let ver = 0, na = 0, firm = 0; const pend = [], porConf = [];
    items.forEach(it => {
      const x = s.items[it.id] || { aplica: it.aplica, estado: "" };
      if (x.aplica === "Verificar") { ver++; porConf.push(it.codigo); }
      if (x.aplica === "N/A" || x.estado === "N/A") { na++; return; }
      if (x.estado === "Firmado") firm++; else if (x.aplica !== "Verificar") pend.push(it.codigo + (x.estado ? ` (${x.estado})` : ""));
    });
    const aplic = items.length - na;
    const qaOk = s.qa.planos === "Sí" && s.qa.area === "Sí";
    const apto = ver === 0 && pend.length === 0 && qaOk;
    return { total: items.length, ver, na, aplic, firm, pend, porConf, qaOk, apto, pct: aplic ? Math.round((firm / aplic) * 100) : 0 };
  }
  function chipFor(sub) {
    const s = store.get(KEY + sub.id, null);
    if (!s || !s.updated) return '<span class="chip na">Sin iniciar</span>';
    const c = calc(sub, state(sub.id));
    if (c.apto) return '<span class="chip ok">APTO</span>';
    return `<span class="chip warn">${c.firm}/${c.aplic}</span>`;
  }

  // ---------- navegación ----------
  function go(hash) { location.hash = hash; }
  window.addEventListener("hashchange", route);
  $back.addEventListener("click", () => history.length > 1 ? history.back() : go("#/"));
  function header(t, st, back) { $title.textContent = t; $subtitle.textContent = st; $back.hidden = !back; document.title = t; }
  function route() {
    const h = location.hash.replace(/^#\/?/, "").split("/");
    window.scrollTo(0, 0);
    if (h[0] === "f" && h[1] !== undefined) return familia(decodeURIComponent(h[1]));
    if (h[0] === "s" && SUBS[decodeURIComponent(h[1])]) return checklist(SUBS[decodeURIComponent(h[1])]);
    if (h[0] === "v" && SUBS[decodeURIComponent(h[1])]) return validar(SUBS[decodeURIComponent(h[1])]);
    return inicio();
  }

  // ---------- pantalla 1: familias ----------
  function inicio() {
    header("Caminata de entrega", "Checklist de protocolos · 100% avance", false);
    let html = `<h2>1. Elige el sistema</h2>`;
    D.familias.forEach(f => {
      const subs = D.subsistemas.filter(s => s.familia === f);
      const aptos = subs.filter(s => { const st = store.get(KEY + s.id, null); return st && calc(s, state(s.id)).apto; }).length;
      html += `<button class="card list-btn" data-f="${esc(f)}"><div class="grow"><div class="t">${esc(f)}</div>
        <div class="s">${subs.length} subsistemas · ${aptos} APTO</div></div><span class="chev">›</span></button>`;
    });
    html += `<h2>Respaldo</h2><div class="card"><p class="muted" style="margin-top:0">Los avances se guardan solo en este teléfono. Exporta un respaldo para pasarlos a otro equipo.</p>
      <div class="grid2"><button class="btn sec" id="bkExp">Exportar respaldo</button><label class="btn sec" style="text-align:center">Importar respaldo
      <input type="file" id="bkImp" accept="application/json" hidden></label></div></div>
      <p class="muted" style="text-align:center">${esc(D.contrato)} · datos ${esc(D.version)}</p>`;
    view.innerHTML = html;
    view.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => go("#/f/" + encodeURIComponent(b.dataset.f))));
    document.getElementById("bkExp").addEventListener("click", exportarRespaldo);
    document.getElementById("bkImp").addEventListener("change", importarRespaldo);
  }
  function exportarRespaldo() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("cc101:")) out[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify(out)], { type: "application/json" });
    descargar(blob, `respaldo_caminata_cc101_${ahora().id}.json`);
  }
  function importarRespaldo(e) {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { const o = JSON.parse(t); let n = 0;
      Object.entries(o).forEach(([k, v]) => { if (k.startsWith("cc101:")) { localStorage.setItem(k, v); n++; } });
      toast(`Respaldo importado (${n} registros)`); inicio();
    }).catch(() => toast("Archivo de respaldo no válido"));
  }

  // ---------- pantalla 2: subsistemas ----------
  function familia(f) {
    header(f, "2. Elige el subsistema", true);
    const subs = D.subsistemas.filter(s => s.familia === f);
    view.innerHTML = `<input class="search" id="q" type="search" placeholder="Buscar por código, TAG o descripción" autocomplete="off"><div id="lst"></div>`;
    const lst = document.getElementById("lst");
    function draw(q) {
      q = (q || "").toLowerCase();
      const r = subs.filter(s => !q || (s.id + " " + s.tag + " " + s.desc + " " + s.sistema).toLowerCase().includes(q));
      lst.innerHTML = r.map(s => `<button class="card list-btn" data-s="${esc(s.id)}"><div class="grow">
        <div class="t">${esc(s.id)}${s.tag ? " · " + esc(s.tag) : ""}</div><div class="s">${esc(s.desc)}</div>
        <div class="s">${esc(D.plantillas[s.plantilla].nombre)}</div></div>${chipFor(s)}</button>`).join("") ||
        `<p class="muted">Sin resultados.</p>`;
      lst.querySelectorAll("[data-s]").forEach(b => b.addEventListener("click", () => go("#/s/" + encodeURIComponent(b.dataset.s))));
    }
    const q = document.getElementById("q"); q.addEventListener("input", () => draw(q.value)); draw("");
  }

  // ---------- pantalla 3: checklist ----------
  function seg(name, opts, val) {
    return `<div class="seg" data-name="${name}">` + opts.map(([v, cls, lab]) =>
      `<button type="button" data-v="${esc(v)}" class="${cls}${val === v ? " on" : ""}">${esc(lab || v)}</button>`).join("") + `</div>`;
  }
  const SI_NO = [["Sí", "v-si"], ["No", "v-no"]];
  const APLICA = [["Sí", "v-si"], ["N/A", "v-na"], ["Verificar", "v-verificar", "Verif."]];
  const ESTADO = [["Firmado", "v-firmado"], ["En revisión", "v-revision", "Revisión"], ["Pendiente", "v-pendiente"]];

  function protoCard(it, x, n) {
    const na = x.aplica === "N/A";
    const done = !na && x.aplica === "Sí" && x.estado === "Firmado";
    return `<div class="card proto${na ? " na" : ""}${done ? " done" : ""}" data-it="${esc(it.id)}">
      <div class="head"><div class="grow" style="flex:1;min-width:0">
        <div class="code">${n}. ${esc(it.codigo)}</div><div class="name">${esc(it.nombre)}</div>
        <div class="meta">${esc(it.disc)}</div></div></div>
      <details><summary>Actividades que respalda</summary><p>${esc(it.acts)}</p></details>
      <div class="row"><label>¿Aplica?</label>${seg("aplica", APLICA, x.aplica)}</div>
      ${na || x.aplica === "Verificar" ? "" : `
      <div class="row"><label>Estado</label>${seg("estado", ESTADO, x.estado)}</div>
      <div class="fields">
        <input type="text" data-k="folio" placeholder="N° protocolo / folio" value="${esc(x.folio)}">
        <input type="date" data-k="fecha" value="${esc(x.fecha)}" aria-label="Fecha del protocolo">
        <textarea class="full" data-k="obs" placeholder="Observaciones">${esc(x.obs)}</textarea>
      </div>`}
      ${na ? `<div class="fields"><textarea class="full" data-k="obs" placeholder="Motivo N/A (opcional)">${esc(x.obs)}</textarea></div>` : ""}
    </div>`;
  }

  function checklist(sub) {
    const pl = D.plantillas[sub.plantilla];
    header(sub.id, sub.tag || pl.nombre, true);
    const s = state(sub.id);
    const ult = s.validaciones[s.validaciones.length - 1];
    let html = `<div class="card"><div class="kv">
        <b>Subsistema</b><span>${esc(sub.id)} – ${esc(sub.desc)}</span>
        <b>TAG</b><span>${esc(sub.tag || "—")}</span>
        <b>Plantilla</b><span>${esc(sub.plantilla)} – ${esc(pl.nombre)}</span></div>
        ${pl.nota ? `<p class="muted" style="margin-bottom:0">Nota: ${esc(pl.nota)}</p>` : ""}
        ${ult ? `<p class="muted" style="margin-bottom:0">Última validación: ${esc(ult.fecha)} · ${esc(ult.nombre)} · <b>${esc(ult.resultado)}</b></p>` : ""}
      </div>
      <h2>A. Validación de la citación</h2>
      <div class="card" id="qa">
        <div class="q"><span>¿Planos red-line / as-built disponibles?</span>${seg("planos", SI_NO, s.qa.planos)}</div>
        <div class="q"><span>¿Área limpia, ordenada, segura y accesible?</span>${seg("area", SI_NO, s.qa.area)}</div>
      </div>
      <h2>B. Verificación de protocolos (${pl.items.length})</h2><div id="protos">`;
    pl.items.forEach((it, i) => { html += protoCard(it, itemState(s, it), i + 1); });
    html += `</div><button class="btn sec block" id="reset">Reiniciar este checklist</button>
      <div class="bottombar"><div class="in"><div class="stat" id="stat"></div>
      <button class="btn" id="goVal">Validar y exportar</button></div></div>`;
    view.innerHTML = html;

    const stat = document.getElementById("stat");
    function refreshStat() {
      const c = calc(sub, s);
      stat.innerHTML = `<b>${c.firm}/${c.aplic}</b> firmados${c.ver ? ` · ${c.ver} por confirmar` : ""} ·
        <span class="chip ${c.apto ? "ok" : "bad"}">${c.apto ? "APTO" : "NO APTO"}</span>
        <div class="bar"><i style="width:${c.aplic ? (c.firm / c.aplic) * 100 : 0}%"></i></div>`;
    }
    refreshStat();

    document.getElementById("qa").addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      const g = b.parentElement, name = g.dataset.name;
      s.qa[name] = s.qa[name] === b.dataset.v ? "" : b.dataset.v;
      g.querySelectorAll("button").forEach(x => x.classList.toggle("on", x.dataset.v === s.qa[name]));
      save(sub.id, s); refreshStat();
    });
    const protos = document.getElementById("protos");
    protos.addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      const card = b.closest("[data-it]"), it = pl.items.find(x => x.id === card.dataset.it), x = itemState(s, it);
      const name = b.parentElement.dataset.name;
      if (name === "aplica") { x.aplica = b.dataset.v; if (x.aplica !== "Sí") x.estado = x.aplica === "N/A" ? "N/A" : ""; else if (x.estado === "N/A") x.estado = ""; }
      else x.estado = x.estado === b.dataset.v ? "" : b.dataset.v;
      save(sub.id, s);
      const n = pl.items.indexOf(it) + 1;
      card.outerHTML = protoCard(it, x, n);
      refreshStat();
    });
    protos.addEventListener("input", e => {
      const el = e.target; if (!el.dataset.k) return;
      const card = el.closest("[data-it]"), it = pl.items.find(x => x.id === card.dataset.it);
      itemState(s, it)[el.dataset.k] = el.value; save(sub.id, s);
    });
    document.getElementById("goVal").addEventListener("click", () => go("#/v/" + encodeURIComponent(sub.id)));
    document.getElementById("reset").addEventListener("click", () => {
      if (!confirm("¿Borrar todas las respuestas de este checklist en este teléfono?")) return;
      localStorage.removeItem(KEY + sub.id); checklist(sub); toast("Checklist reiniciado");
    });
  }

  // ---------- pantalla 4: validación, firma y PDF ----------
  function validar(sub) {
    const pl = D.plantillas[sub.plantilla];
    header("Validación", sub.id + (sub.tag ? " · " + sub.tag : ""), true);
    const s = state(sub.id); pl.items.forEach(it => itemState(s, it));
    const c = calc(sub, s);
    const firm = store.get("cc101:firmante", { nombre: "", correo: "" });
    const faltas = [];
    if (s.qa.planos !== "Sí") faltas.push("Planos red-line / as-built: " + (s.qa.planos || "sin respuesta"));
    if (s.qa.area !== "Sí") faltas.push("Área limpia y accesible: " + (s.qa.area || "sin respuesta"));
    if (c.porConf.length) faltas.push("Aplicabilidad por confirmar: " + c.porConf.join(", "));
    if (c.pend.length) faltas.push("Protocolos no firmados: " + c.pend.join(", "));
    view.innerHTML = `
      <div class="card"><div class="result ${c.apto ? "ok" : "bad"}">${c.apto ? "APTO PARA CITAR A CAMINATA" : "NO APTO – EXISTEN PENDIENTES"}</div>
        <div class="kv" style="margin-top:12px"><b>Aplicables</b><span>${c.aplic}</span><b>Firmados</b><span>${c.firm} (${c.pct}%)</span>
        <b>Pendientes</b><span>${c.aplic - c.firm}</span><b>N/A</b><span>${c.na}</span></div>
        ${faltas.length ? `<ul class="pend">${faltas.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}</div>
      <h2>Firma – ITO / Inspección Codelco</h2>
      <div class="card">
        <div class="fields">
          <input class="full" type="text" id="fNombre" placeholder="Nombre ITO / Inspección Codelco" value="${esc(firm.nombre)}">
          <input class="full" type="email" id="fCorreo" placeholder="Enviar a (correo, opcional)" value="${esc(firm.correo)}">
        </div>
        <p class="muted">Firme dentro del recuadro:</p>
        <div class="sig-wrap" id="sigWrap"><canvas id="sig"></canvas><div class="ph" id="sigPh">Firma aquí</div></div>
        <button class="btn sec block" id="sigClear">Borrar firma</button>
        ${c.apto ? "" : `<p class="muted"><b>Atención:</b> el PDF quedará marcado como NO APTO y no habilita la caminata.</p>`}
        <button class="btn block" id="genPdf">Generar PDF firmado</button>
        <p class="muted" id="pdfErr" hidden style="color:#A61B1B;word-break:break-word"></p>
        <div id="after" hidden>
          <button class="btn block" id="share">Enviar / compartir PDF</button>
          <button class="btn sec block" id="dl">Descargar PDF</button>
          <button class="btn sec block" id="mail">Abrir correo</button>
          <button class="btn block" id="home" style="background:#1E7B3A">Volver al inicio</button>
        </div>
      </div>`;
    const pad = signaturePad(document.getElementById("sig"), document.getElementById("sigPh"));
    document.getElementById("sigClear").addEventListener("click", () => pad.clear());
    let pdfFile = null;
    document.getElementById("genPdf").addEventListener("click", async () => {
      const f = { nombre: v("fNombre"), cargo: "ITO / Inspección Codelco", correo: v("fCorreo") };
      if (!f.nombre) return toast("Ingresa el nombre del ITO / Inspección Codelco");
      if (pad.isEmpty()) return toast("Falta la firma");
      store.set("cc101:firmante", f);
      const t = ahora(); const docId = `CC101-${sub.id}-${t.id}`;
      const errBox = document.getElementById("pdfErr"); errBox.hidden = true;
      const etapa = { v: "preparación" };
      try {
        etapa.v = "firma (imagen)"; const sig = pad.images();
        etapa.v = "librería PDF"; await ensurePdfLib();
        etapa.v = "documento";
        const bytes = await buildPdf(sub, pl, s, c, f, sig, t.txt, docId, etapa);
        etapa.v = "archivo";
        const name = `Caminata_${sub.id}_${c.apto ? "APTO" : "NO_APTO"}_${t.id}.pdf`;
        try { pdfFile = new File([bytes], name, { type: "application/pdf" }); }
        catch (e) { pdfFile = new Blob([bytes], { type: "application/pdf" }); pdfFile.name = name; }
        etapa.v = "registro";
        s.validaciones.push({ fecha: t.txt, nombre: f.nombre, resultado: c.apto ? "APTO" : "NO APTO", docId }); save(sub.id, s);
        document.getElementById("after").hidden = false; toast("PDF generado");
      } catch (err) {
        console.error(err);
        errBox.hidden = false;
        errBox.textContent = `No se pudo generar el PDF (etapa: ${etapa.v}). Detalle: ${err && (err.message || err)}`;
        toast("Error al generar el PDF – ver detalle");
      }
    });
    document.getElementById("share").addEventListener("click", async () => {
      if (!pdfFile) return;
      const txt = `Checklist caminata 100% – ${sub.id} ${sub.tag} – ${c.apto ? "APTO para citar a caminata" : "NO APTO"}`;
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try { await navigator.share({ files: [pdfFile], title: pdfFile.name, text: txt }); } catch (e) { /* cancelado */ }
      } else { descargar(pdfFile, pdfFile.name); toast("Tu navegador no permite compartir archivos: se descargó el PDF"); }
    });
    document.getElementById("home").addEventListener("click", () => go("#/"));
    document.getElementById("dl").addEventListener("click", () => pdfFile && descargar(pdfFile, pdfFile.name));
    document.getElementById("mail").addEventListener("click", () => {
      const to = v("fCorreo");
      const subj = `Citación caminata 100% – ${sub.id} ${sub.tag}`;
      const body = `Se adjunta checklist de protocolos validado para ${sub.id} – ${sub.desc}.\nResultado: ${c.apto ? "APTO para citar a caminata" : "NO APTO"}.\n\n(Adjuntar el PDF descargado: ${pdfFile ? pdfFile.name : ""})`;
      location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    });
  }
  const v = id => document.getElementById(id).value.trim();
  function descargar(blob, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function signaturePad(canvas, ph) {
    // La firma se guarda como trazos normalizados (0..1): se re-dibuja al instante si cambia el tamaño de pantalla.
    const ctx = canvas.getContext("2d"); let drawing = false; const strokes = [];
    function paint(c, w, h, lw) {
      c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#0B2A6B";
      strokes.forEach(st => { if (st.length < 2) return; c.beginPath(); c.moveTo(st[0][0] * w, st[0][1] * h);
        st.slice(1).forEach(([x, y]) => c.lineTo(x * w, y * h)); c.stroke(); });
    }
    function size() {
      const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint(ctx, r.width, r.height, 2.4); ph.hidden = strokes.length > 0;
    }
    size(); window.addEventListener("resize", size);
    const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    canvas.addEventListener("pointerdown", e => { drawing = true; strokes.push([pos(e)]); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
    canvas.addEventListener("pointermove", e => { if (!drawing) return; const st = strokes[strokes.length - 1], p = pos(e), q = st[st.length - 1];
      const r = canvas.getBoundingClientRect();
      ctx.beginPath(); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.strokeStyle = "#0B2A6B";
      ctx.moveTo(q[0] * r.width, q[1] * r.height); ctx.lineTo(p[0] * r.width, p[1] * r.height); ctx.stroke();
      st.push(p); ph.hidden = true; e.preventDefault(); });
    ["pointerup", "pointercancel"].forEach(ev => canvas.addEventListener(ev, () => { drawing = false; }));
    return {
      clear: () => { strokes.length = 0; size(); },
      isEmpty: () => !strokes.some(st => st.length > 1),
      png: () => { const off = document.createElement("canvas"); off.width = 900; off.height = 360;
        paint(off.getContext("2d"), 900, 360, 5); return off.toDataURL("image/png"); },
      images: () => { // PNG transparente + JPEG con fondo blanco (respaldo para Safari/iPad)
        const off = document.createElement("canvas"); off.width = 600; off.height = 240; const g = off.getContext("2d");
        paint(g, 600, 240, 4); const png = off.toDataURL("image/png");
        g.globalCompositeOperation = "destination-over"; g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 600, 240);
        return { png, jpg: off.toDataURL("image/jpeg", 0.92) }; }
    };
  }

  // ---------- PDF ----------
  const pdfSafe = s => String(s ?? "").normalize("NFC").replace(/\t/g, " ").replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD]/g, "")
    .replace(/[\u00A0\u2007\u202F]/g, " ").replace(/[–—−]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/≤/g, "<=")
    .replace(/≥/g, ">=").replace(/…/g, "...").replace(/[^\x00-\xFF]/g, "");
  function wrap(text, font, size, width) {
    const out = [];
    pdfSafe(text).split("\n").forEach(par => {
      let line = "";
      par.split(/\s+/).forEach(w => {
        const t = line ? line + " " + w : w;
        if (font.widthOfTextAtSize(t, size) <= width) line = t;
        else { if (line) out.push(line); while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
            let k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > width) k--; out.push(w.slice(0, k)); w = w.slice(k); }
          line = w; }
      });
      out.push(line);
    });
    return out;
  }
  // Carga la librería de PDF si no vino con la página (p. ej. archivo no subido a GitHub).
  function loadScript(src) {
    return new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
  }
  async function ensurePdfLib() {
    if (window.PDFLib) return;
    for (const src of ["pdf-lib.min.js", "lib/pdf-lib.min.js",
                       "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
                       "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"]) {
      try { await loadScript(src); if (window.PDFLib) return; } catch (e) { /* probar la siguiente */ }
    }
    throw new Error("No se encontró pdf-lib.min.js. Súbalo a la raíz del repositorio de GitHub (o abra la app con señal).");
  }
  // PDF con el mismo formato de la planilla Excel (01_Plantillas_Genericas_CC-101.xlsx): carta horizontal.
  async function buildPdf(sub, pl, s, c, f, sig, fecha, docId, etapa = { v: "" }) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const hex = h => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
    const C = { navy: hex("1F3864"), navy2: hex("2F5597"), lblue: hex("D9E1F2"), grey: hex("E7E6E6"), line: hex("A6A6A6"), white: rgb(1, 1, 1),
      black: rgb(0, 0, 0), mut: hex("5E6B7E"), okBg: hex("C6EFCE"), okTx: hex("006100"), badBg: hex("FFC7CE"), badTx: hex("9C0006"),
      warnBg: hex("FFEB9C"), naBg: hex("D9D9D9") };
    const doc = await PDFDocument.create();
    doc.setTitle(`Checklist caminata 100% ${sub.id}`); doc.setAuthor(f.nombre); doc.setSubject(docId); doc.setCreator("App Caminata CC-101");
    const R = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = 792, H = 612, M = 24, CW = W - 2 * M, BOTTOM = 34;
    // anchos proporcionales a las columnas A..J de la planilla
    const xl = [5, 16.5, 12, 32, 47.5, 14.7, 12, 15, 11, 30], tot = xl.reduce((a, b) => a + b, 0);
    const cw = xl.map(w => (w / tot) * CW), cx = cw.map((_, i) => M + cw.slice(0, i).reduce((a, b) => a + b, 0));
    const span = (a, b) => cw.slice(a, b + 1).reduce((x, y) => x + y, 0);
    let page, y; // y = distancia desde el borde superior

    function cell(x, w, h, text, o = {}) {
      const font = o.font || R, size = o.size || 7, pad = o.pad ?? 3, lh = size * 1.22;
      if (o.fill || o.border !== false) page.drawRectangle({ x, y: H - y - h, width: w, height: h, color: o.fill, borderColor: o.border === false ? undefined : C.line, borderWidth: o.border === false ? 0 : 0.5 });
      const lines = text === undefined || text === null || text === "" ? [] : wrap(String(text), font, size, w - 2 * pad);
      let ty = o.valign === "top" ? y + pad + size : y + (h - lines.length * lh) / 2 + size * 0.95;
      lines.forEach(l => {
        const tw = font.widthOfTextAtSize(l, size);
        const tx = o.align === "center" ? x + (w - tw) / 2 : o.align === "right" ? x + w - pad - tw : x + pad;
        page.drawText(l, { x: tx, y: H - ty, size, font, color: o.color || C.black }); ty += lh;
      });
      return lines.length * lh + 2 * pad;
    }
    const need = (text, w, size = 7, font = R) => wrap(String(text || ""), font, size, w - 6).length * size * 1.22 + 6;
    const HEAD = ["N°", "Disciplina", "Protocolo", "Nombre del protocolo", "Actividades que respalda (PIE)", "¿Aplica?", "Estado protocolo", "N° protocolo / folio", "Fecha protocolo", "Observaciones"];
    function headRow() { HEAD.forEach((t, i) => cell(cx[i], cw[i], 22, t, { font: B, size: 6.8, fill: C.navy, color: C.white, align: "center" })); y += 22; }
    function newPage() { page = doc.addPage([W, H]); y = M; }

    // ----- encabezado (filas 1–12 de la planilla)
    newPage();
    cell(M, CW, 22, "CHECKLIST DE PROTOCOLOS – CAMINATA AL 100% DE AVANCE CONSTRUCTIVO", { font: B, size: 12, fill: C.navy, color: C.white, align: "center" }); y += 22;
    cell(M, CW, 13, pl.subtitulo, { size: 7, fill: C.navy2, color: C.white, align: "center" }); y += 13;
    cell(M, CW, 13, "DATOS DEL ACTIVO", { font: B, size: 7.5, fill: C.lblue }); y += 13;
    [["Subsistema", `${sub.id} – ${sub.desc}`], ["TAG", sub.tag || "—"]].forEach(([k, val]) => {
      cell(M, span(0, 2), 13, k, { font: B, size: 7.5, fill: C.grey }); cell(cx[3], span(3, 9), 13, val, { font: B, size: 7.5 }); y += 13; });
    y += 8;
    cell(M, CW, 14, "A. VALIDACIÓN DE LA CITACIÓN A CAMINATA", { font: B, size: 8, fill: C.navy2, color: C.white }); y += 14;
    [["¿Planos red-line / as-built disponibles?", s.qa.planos], ["¿Área limpia, ordenada, segura y accesible para la caminata?", s.qa.area]].forEach(([q, a]) => {
      cell(M, span(0, 4), 13, q, { size: 7.5 });
      cell(cx[5], span(5, 6), 13, a || "Sin respuesta", { font: B, size: 7.5, align: "center", fill: a === "Sí" ? C.okBg : C.badBg, color: a === "Sí" ? C.okTx : C.badTx });
      cell(cx[7], span(7, 9), 13, ""); y += 13; });
    y += 8;
    cell(M, CW, 14, "B. VERIFICACIÓN DE PROTOCOLOS", { font: B, size: 8, fill: C.navy2, color: C.white }); y += 14;
    headRow();

    // ----- filas de protocolos
    pl.items.forEach((it, i) => {
      const x = s.items[it.id];
      const estado = x.aplica === "N/A" ? "N/A" : (x.aplica === "Verificar" ? "" : (x.estado || ""));
      const vals = [it.n || i + 1, it.disc, it.codigo, it.nombre, it.acts, x.aplica, estado, x.folio, fmtFecha(x.fecha), x.obs];
      const h = Math.max(16, ...vals.map((v, k) => need(v, cw[k], 6.8, k === 2 ? B : R)));
      if (y + h > H - BOTTOM) { newPage(); headRow(); }
      const fillAp = x.aplica === "Verificar" ? C.warnBg : x.aplica === "N/A" ? C.naBg : undefined;
      const fillEs = { "Firmado": C.okBg, "Pendiente": C.badBg, "En revisión": C.warnBg, "N/A": C.naBg }[estado];
      vals.forEach((v, k) => cell(cx[k], cw[k], h, v, { size: 6.8, font: k === 2 ? B : R,
        align: [0, 2, 5, 6, 8].includes(k) ? "center" : "left",
        fill: k === 5 ? fillAp : k === 6 ? fillEs : undefined, color: k === 5 ? C.navy2 : C.black }));
      y += h;
    });

    // ----- RESUMEN + FIRMA (mismo arreglo que la planilla)
    const rowH = 13, sigH = 44, blockH = rowH * 8 + sigH + 30;
    y += rowH;
    if (y + blockH > H - BOTTOM) newPage();
    const LW = span(0, 3), VW = cw[4], RX = cx[5], RW = span(5, 9);
    const resumen = [["Protocolos en el checklist", c.total], ["Aplicabilidad por confirmar (Verificar)", c.ver], ["Protocolos N/A", c.na],
      ["Protocolos aplicables", c.aplic], ["Protocolos firmados", c.firm], ["Protocolos pendientes", c.aplic - c.firm],
      ["% cumplimiento", (c.aplic ? (c.firm / c.aplic) * 100 : 0).toFixed(1).replace(".", ",") + "%"]];
    cell(M, LW + VW, rowH, "RESUMEN", { font: B, size: 7.5, fill: C.lblue }); y += rowH;
    resumen.forEach(([k, val], i) => {
      cell(M, LW, rowH, k, { size: 7.5 }); cell(cx[4], VW, rowH, String(val), { font: B, size: 7.5, align: "center" });
      if (i === 5) cell(RX, RW, rowH, "FIRMA", { font: B, size: 7.5, fill: C.lblue, align: "center" });
      if (i === 6) { // encabezados del cuadro de firma
        const fw = [RW * 0.25, RW * 0.3, RW * 0.3, RW * 0.15]; let fx = RX;
        ["Cargo", "Nombre", "Firma", "Fecha"].forEach((t, k) => { cell(fx, fw[k], rowH, t, { font: B, size: 7, fill: C.grey, align: "center" }); fx += fw[k]; });
      }
      y += rowH;
    });
    // fila de estado + fila de firma ITO
    const ok = c.apto;
    cell(M, LW + VW, sigH, ok ? "APTO PARA CAMINATA – PROTOCOLOS CERRADOS" : "NO APTO – EXISTEN PENDIENTES",
      { font: B, size: 11, align: "center", fill: ok ? C.okBg : C.badBg, color: ok ? C.okTx : C.badTx });
    const fw = [RW * 0.25, RW * 0.3, RW * 0.3, RW * 0.15]; let fx = RX;
    cell(fx, fw[0], sigH, "ITO / Inspección Codelco", { size: 7, align: "right" }); fx += fw[0];
    cell(fx, fw[1], sigH, f.nombre, { size: 7.5, align: "center" }); fx += fw[1];
    cell(fx, fw[2], sigH, "");
    etapa.v = "insertar firma";
    let img;
    try { img = await doc.embedPng(sig.png); } catch (e) { img = await doc.embedJpg(sig.jpg); }
    etapa.v = "documento (cierre)";
    const sc = Math.min((fw[2] - 6) / img.width, (sigH - 6) / img.height);
    page.drawImage(img, { x: fx + (fw[2] - img.width * sc) / 2, y: H - y - sigH + (sigH - img.height * sc) / 2, width: img.width * sc, height: img.height * sc });
    fx += fw[2];
    cell(fx, fw[3], sigH, fecha.replace(" ", "\n"), { size: 7, align: "center" });
    y += sigH + 6;
    if (!ok) {
      const pend = [];
      if (s.qa.planos !== "Sí") pend.push("Planos red-line / as-built"); if (s.qa.area !== "Sí") pend.push("Área limpia y accesible");
      pend.push(...c.porConf.map(p => p + " (por confirmar)"), ...c.pend);
      wrap("Pendientes: " + pend.join(", "), R, 7, CW).forEach(l => {
        if (y + 10 > H - BOTTOM) newPage(); page.drawText(l, { x: M, y: H - y - 7, size: 7, font: R, color: C.mut }); y += 9.5; });
    }
    // pie de página
    const pages = doc.getPages();
    pages.forEach((p, i) => {
      p.drawText(pdfSafe(`${sub.plantilla} – Checklist caminata 100% · ${sub.id} · Documento ${docId}`), { x: M, y: 16, size: 7, font: R, color: C.mut });
      const t = pdfSafe(`Página ${i + 1} de ${pages.length}`); p.drawText(t, { x: W - M - R.widthOfTextAtSize(t, 7), y: 16, size: 7, font: R, color: C.mut });
    });
    etapa.v = "guardar PDF";
    return await doc.save({ useObjectStreams: false });
  }

  // ---------- inicio ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  route();
})();
