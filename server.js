const http = require("http");
const fs = require("fs");
const path = require("path");

// المفتاح يُقرأ من متغير البيئة على Render (آمن 100%)
const API_KEY = process.env.ANTHROPIC_API_KEY || "";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204); res.end(); return;
  }

  // الصفحة الرئيسية
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    try {
      const file = fs.readFileSync(path.join(__dirname, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(file);
    } catch(e) {
      res.writeHead(404); res.end("index.html not found");
    }
    return;
  }

  // Claude API proxy
  if (req.method === "POST" && req.url === "/api/chat") {
    if (!API_KEY) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "ANTHROPIC_API_KEY غير محدد في متغيرات البيئة" } }));
      return;
    }
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: e.message } }));
      }
    });
    return;
  }

  res.writeHead(404); res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`BARRAY Truck Agent V3 — يعمل على المنفذ ${PORT} ✅`);
});
