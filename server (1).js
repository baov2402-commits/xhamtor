// Vườn Bình Yên – server game nhiều người chơi (KHTN 7 Vật lí, bài 8–20)
// Không cần thư viện ngoài: chỉ dùng Node.js có sẵn (http + Server-Sent Events).
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const PUB = path.join(__dirname, "public");
const MAX_PLAYERS = 200;
const AV = ["🐢","🦦","🐨","🐼","🦥","🐳","🦔","🐝","🐸","🦊","🐰","🐧"];

if (!process.env.ADMIN_PASSWORD) console.warn("⚠️  Chưa đặt ADMIN_PASSWORD – đang dùng mật khẩu mặc định 'admin123'.");

const rooms = new Map();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json; charset=utf-8" };

const rid = () => crypto.randomBytes(12).toString("base64url");
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, n);
const num = (v, max = 1e6) => Math.max(0, Math.min(max, Math.floor(+v || 0)));
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((ok) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 1e5) req.destroy(); });
    req.on("end", () => { try { ok(d ? JSON.parse(d) : {}); } catch { ok({}); } });
    req.on("error", () => ok({}));
  });
}
function newCode() { let c; do c = String(1000 + crypto.randomInt(9000)); while (rooms.has(c)); return c; }
const left = (r) => (r.phase === "play" ? Math.max(0, r.endAt - Date.now()) : 0);

function board(r) {
  return [...r.players.values()]
    .map((p) => ({ id: p.id, nick: p.nick, av: p.av, score: p.score, ok: p.ok, ans: p.ans, done: p.done, m0: p.m0, m1: p.m1, online: p.streams.size > 0 }))
    .sort((a, b) => b.score - a.score || b.ok - a.ok);
}
const publicState = (r) => ({ code: r.code, phase: r.phase, left: left(r), dur: r.dur, lessons: r.lessons, round: r.round, board: board(r) });

function sseOpen(req, res) {
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.write("retry: 2000\n\n");
}
const ssePush = (res, ev, data) => { try { res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch {} };

function broadcast(r) {
  r.dirty = false; r.touched = Date.now();
  const s = publicState(r);
  for (const res of r.admins) ssePush(res, "state", s);
  for (const p of r.players.values()) for (const res of p.streams) ssePush(res, "state", { ...s, me: p.id });
}
function resetRound(r) {
  r.round++; r.phase = "lobby"; r.endAt = 0;
  for (const p of r.players.values()) Object.assign(p, { score: 0, ok: 0, ans: 0, done: false, m1: null });
}

// Đồng hồ chung: kết thúc ván khi hết giờ, gửi cập nhật, dọn phòng cũ
setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    if (r.phase === "play" && now >= r.endAt) { r.phase = "end"; r.dirty = true; }
    if (r.dirty) broadcast(r);
    if (now - r.touched > 6 * 3600e3 && !r.admins.size) rooms.delete(r.code);
  }
}, 1000);
// Giữ kết nối SSE sống (Render/proxy hay cắt kết nối im lặng)
setInterval(() => {
  for (const r of rooms.values()) {
    for (const res of r.admins) { try { res.write(": ping\n\n"); } catch {} }
    for (const p of r.players.values()) for (const res of p.streams) { try { res.write(": ping\n\n"); } catch {} }
  }
}, 15000);

function adminRoom(q) { const r = rooms.get(String(q.code || "")); return r && safeEq(q.token || "", r.token) ? r : null; }
function playerOf(q) {
  const r = rooms.get(String(q.code || "")); if (!r) return {};
  const p = r.players.get(String(q.pid || "")); if (!p || !safeEq(q.secret || "", p.secret)) return { r };
  return { r, p };
}

async function api(req, res, url) {
  const q = req.method === "GET" || req.method === "HEAD" ? Object.fromEntries(url.searchParams) : await readBody(req);
  const route = url.pathname;

  // ----- Quản lí -----
  if (route === "/api/admin/create" && req.method === "POST") {
    if (!safeEq(q.pw || "", ADMIN_PASSWORD)) return json(res, 401, { error: "Sai mật khẩu quản lí." });
    const code = newCode();
    const r = { code, token: rid(), phase: "lobby", endAt: 0, dur: 8 * 60000, lessons: [], round: 1, players: new Map(), admins: new Set(), dirty: false, touched: Date.now() };
    rooms.set(code, r);
    return json(res, 200, { code, token: r.token });
  }
  if (route === "/api/admin/stream") {
    const r = adminRoom(q); if (!r) return json(res, 404, { error: "Phòng không tồn tại hoặc đã đóng." });
    if (req.method === "HEAD") return json(res, 200, {});
    sseOpen(req, res); r.admins.add(res); ssePush(res, "state", publicState(r));
    req.on("close", () => r.admins.delete(res));
    return;
  }
  if (route === "/api/admin/action" && req.method === "POST") {
    const r = adminRoom(q); if (!r) return json(res, 404, { error: "Phòng không tồn tại hoặc đã đóng." });
    switch (q.action) {
      case "settings":
        if (r.phase !== "play") {
          if (q.dur) r.dur = Math.max(60000, Math.min(60 * 60000, num(q.dur, 3600000)));
          if (Array.isArray(q.lessons)) r.lessons = q.lessons.map((x) => num(x, 99)).filter((x) => x >= 8 && x <= 20);
        }
        break;
      case "start":
        if (r.phase === "end") resetRound(r);
        r.phase = "play"; r.endAt = Date.now() + r.dur; break;
      case "end": if (r.phase === "play") r.phase = "end"; break;
      case "reset": resetRound(r); break;
      case "kick": {
        const p = r.players.get(String(q.pid || ""));
        if (p) { for (const s of p.streams) { ssePush(s, "kicked", {}); try { s.end(); } catch {} } r.players.delete(p.id); }
        break;
      }
      case "close":
        for (const p of r.players.values()) for (const s of p.streams) { ssePush(s, "closed", {}); try { s.end(); } catch {} }
        for (const s of r.admins) { try { s.end(); } catch {} }
        rooms.delete(r.code); return json(res, 200, { ok: true });
      default: return json(res, 400, { error: "Lệnh không hợp lệ." });
    }
    broadcast(r);
    return json(res, 200, { ok: true });
  }

  // ----- Người chơi -----
  if (route === "/api/join" && req.method === "POST") {
    const r = rooms.get(String(q.code || "").trim());
    if (!r) return json(res, 404, { error: "Không tìm thấy phòng. Kiểm tra lại mã nhé!" });
    if (r.players.size >= MAX_PLAYERS) return json(res, 403, { error: "Phòng đã đầy." });
    const nick = clean(q.nick, 16); if (!nick) return json(res, 400, { error: "Bạn cần nhập tên." });
    const p = { id: rid(), secret: rid(), nick, av: AV.includes(q.av) ? q.av : AV[0], m0: q.m0 == null ? null : num(q.m0, 4), m1: null,
      score: 0, ok: 0, ans: 0, done: false, streams: new Set() };
    r.players.set(p.id, p); r.dirty = true;
    return json(res, 200, { pid: p.id, secret: p.secret, state: { ...publicState(r), me: p.id } });
  }
  if (route === "/api/stream") {
    const { r, p } = playerOf(q); if (!p) return json(res, 404, { error: "Không còn trong phòng." });
    if (req.method === "HEAD") return json(res, 200, {});
    sseOpen(req, res); p.streams.add(res); r.dirty = true;
    ssePush(res, "state", { ...publicState(r), me: p.id });
    req.on("close", () => { p.streams.delete(res); r.dirty = true; });
    return;
  }
  if (route === "/api/update" && req.method === "POST") {
    const { r, p } = playerOf(q); if (!p) return json(res, 404, { error: "Không còn trong phòng." });
    if (+q.round === r.round) {
      if (r.phase === "play") Object.assign(p, { score: num(q.score), ok: num(q.ok, 10000), ans: num(q.ans, 10000), done: !!q.done });
      if (q.m1 != null) p.m1 = num(q.m1, 4);
      r.dirty = true;
    }
    return json(res, 200, { ok: true });
  }
  if (route === "/api/leave" && req.method === "POST") {
    const { r, p } = playerOf(q); if (p) { r.players.delete(p.id); r.dirty = true; }
    return json(res, 200, { ok: true });
  }
  json(res, 404, { error: "Không có API này." });
}

// Chỉ phục vụ đúng 5 file giao diện. Tìm trong thư mục public/ trước,
// nếu không có thì tìm ngay cạnh server.js (phòng khi tải file lên GitHub không có thư mục public).
const FILES = ["index.html", "admin.html", "style.css", "fx.js", "questions.js"];
function findFile(name) {
  for (const dir of [PUB, __dirname]) { const fp = path.join(dir, name); if (fs.existsSync(fp)) return fp; }
  return null;
}
function serveStatic(req, res, url) {
  let f = url.pathname.replace(/^\/+/, "");
  if (f === "") f = "index.html";
  if (f === "admin" || f === "quan-li") f = "admin.html";
  f = f.replace(/^public\//, "");
  const fp = FILES.includes(f) ? findFile(f) : null;
  if (!fp) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Không tìm thấy trang. Thiếu file: " + (FILES.includes(f) ? f : "(đường dẫn không hợp lệ)") + ". Hãy tải đủ 5 file index.html, admin.html, style.css, fx.js, questions.js lên GitHub.");
  }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Không tìm thấy trang."); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") return json(res, 200, { ok: true, rooms: rooms.size });
  if (url.pathname.startsWith("/api/")) return api(req, res, url).catch((e) => { console.error(e); json(res, 500, { error: "Lỗi máy chủ." }); });
  serveStatic(req, res, url);
}).listen(PORT, () => console.log(`🌿 Vườn Bình Yên chạy tại http://localhost:${PORT}  (quản lí: /admin)`));
