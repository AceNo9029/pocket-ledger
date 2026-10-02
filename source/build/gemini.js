  // ---------- Gemini (scanning + chat) ----------
  const KEY_LS = "pl-gemini-key", MODEL_LS = "pl-gemini-model";
  const MODEL_CHAIN = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
  const lsGet = k => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
  const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };
  // A key set on this device wins; otherwise the household's shared key.
  const householdKey = () => String((household && household.gemini && household.gemini.key) || "").trim();
  const geminiKey = () => lsGet(KEY_LS).trim() || householdKey();
  const serverAI = () => !!(household && household.ai && household.ai.server) || (SP.spaces || []).some(s => s.ai);
  const aiReady = () => !!(geminiKey() || serverAI());
  let callableP = null;
  async function serverGemini(payload, signal) {
    if (!callableP) callableP = import("https://www.gstatic.com/firebasejs/" + fbctx.sdk + "/firebase-functions.js")
      .then(m => m.httpsCallable(m.getFunctions(fbctx.app, "asia-south1"), "gemini", { timeout: 120000 }));
    let fn; try { fn = await callableP; } catch { callableP = null; throw { code: "offline" }; }
    const aborted = new Promise((_, rej) => { if (signal) signal.addEventListener("abort", () => rej({ code: "cancelled" }), { once: true }); });
    try {
      const r = await Promise.race([fn(payload), aborted]);
      return (r && r.data && r.data.text) || "";
    } catch (e) {
      if (e && e.code === "cancelled") throw e;
      const c = String((e && e.code) || "").replace("functions/", "");
      throw { code: c === "resource-exhausted" ? "rate_limited" : c === "failed-precondition" ? "bad_key" : c === "unauthenticated" || c === "permission-denied" ? "http" : "http", message: (e && e.message) || c };
    }
  }
  async function shrinkImage(file) {
    let bmp;
    try { bmp = await createImageBitmap(file); } catch { throw { code: "image_rejected", message: (file.type || "unknown type") + ", " + Math.round((file.size || 0) / 1024) + " KB" }; }
    const max = 1600, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * sc)); c.height = Math.max(1, Math.round(bmp.height * sc));
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    return c.toDataURL("image/jpeg", 0.8).split(",")[1];
  }
  async function geminiText(prompt, files, opts) {
    opts = opts || {};
    const signal = opts.signal;
    const key = geminiKey(), server = serverAI();
    if (!key && !server) throw { code: "no_key" };
    if (!navigator.onLine) throw { code: "offline" };
    const parts = [{ text: prompt }];
    for (const f of files || []) parts.push({ inline_data: { mime_type: "image/jpeg", data: await shrinkImage(f) } });
    if (opts.audio) parts.push({ inline_data: { mime_type: "audio/wav", data: opts.audio } });
    if (signal && signal.aborted) throw { code: "cancelled" };
    const gen = { temperature: opts.temperature ?? 0.1 };
    if (opts.json) gen.response_mime_type = "application/json";
    if (server) return serverGemini({ contents: [{ role: "user", parts }], generationConfig: gen, model: lsGet(MODEL_LS).trim() || null }, signal);
    const body = JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: gen });
    const call = async model => {
      try {
        return await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body, signal });
      } catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "offline" }; }
    };
    const wait = ms => new Promise(res => setTimeout(res, ms));
    // Try the chosen model, then fall back through other current Flash models
    // if one isn't available to this key, is overloaded, or has no free quota.
    const own = lsGet(MODEL_LS).trim();
    const chain = own ? [own] : MODEL_CHAIN;
    let r = null, msg = "", status = 0;
    for (const model of chain) {
      for (let attempt = 0; attempt < 2; attempt++) {
        r = await call(model);
        if (r.ok) break;
        status = r.status; msg = "";
        try { msg = ((await r.clone().json()).error || {}).message || ""; } catch {}
        if ((status === 503 || status === 500) && attempt === 0) { await wait(1500); continue; }
        break;
      }
      if (r.ok) break;
      const noQuota = status === 429 && /limit:\s*0\b|free_tier/i.test(msg);
      const tryNext = status === 404 || status >= 500 || noQuota || (status === 400 && /not found|not supported|unsupported|model/i.test(msg) && !/api.?key/i.test(msg));
      if (!tryNext) break;
    }
    if (!r.ok) {
      throw { code: status === 429 ? "rate_limited" : (status === 401 || status === 403 || /api.?key/i.test(msg)) ? "bad_key" : "http", message: (status ? "HTTP " + status + ": " : "") + msg };
    }
    const j = await r.json();
    const cand = (j.candidates || [])[0];
    const text = cand && cand.content ? (cand.content.parts || []).filter(p => !p.thought).map(p => p.text || "").join("") : "";
    if (!text) throw { code: j.promptFeedback && j.promptFeedback.blockReason ? "refused" : "http", message: "Empty answer" + (cand && cand.finishReason ? " (" + cand.finishReason + ")" : "") };
    return text;
  }
  function parseJsonText(text) {
    const t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(t); } catch {}
    const m = t.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    throw { code: "http", message: "Couldn't understand the answer: " + t.slice(0, 120) };
  }
  async function geminiJson(prompt, files, signal) {
    return parseJsonText(await geminiText(prompt, files, { json: true, signal }));
  }

