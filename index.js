import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Mirror domains for fallback
const MIRRORS = [
  "data.terabox.com",
  "data.gibibox.com",
  "data.4funbox.com",
  "data.1024tera.com",
  "data.terabox.app"
];

// Helper: extract file name from Terabox HTML
function extractTitle(html) {
  const match = html.match(/"filename":"([^"]+)"/);
  return match ? decodeURIComponent(match[1]) : "Untitled";
}

app.get("/", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ ok: false, error: "Missing ?url parameter" });
  }

  try {
    let targetUrl = url.trim();

    // 🔹 If it's a share link, fetch the page and find the direct data.* link
    if (/terabox\.com\/s\//.test(targetUrl)) {
      const html = await fetch(targetUrl).then((r) => r.text());
      const match = html.match(/https:\/\/data[^"']+/);
      if (!match) {
        return res.json({
          ok: false,
          error: "Could not extract direct link from share page."
        });
      }
      targetUrl = match[0];
    }

    // 🔹 Validate it's a data.* link
    if (!/https:\/\/data\./.test(targetUrl)) {
      return res.json({
        ok: false,
        error: "Invalid link format. Must start with https://data.*"
      });
    }

    // 🔹 Try each mirror to bypass sign error
    for (const domain of MIRRORS) {
      const testUrl = targetUrl.replace(/data\.[^/]+/, domain);
      try {
        const response = await fetch(testUrl, { redirect: "manual" });
        const text = await response.text();

        if (response.ok && !text.includes("sign error")) {
          return res.json({
            ok: true,
            video_title: extractTitle(text),
            download_url: testUrl
          });
        }
      } catch (err) {
        // continue to next mirror
      }
    }

    return res.json({
      ok: false,
      error: "All mirrors returned sign error or failed."
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(3000, () => console.log("terafetchs API running..."));
export default app;
