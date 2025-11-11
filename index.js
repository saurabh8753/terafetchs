import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const MIRRORS = [
  "data.terabox.com",
  "data.gibibox.com",
  "data.4funbox.com",
  "data.1024tera.com",
  "data.terabox.app"
];

function extractDataLink(html) {
  // First try official data.* link pattern
  const regexes = [
    /https:\/\/data[^"']+\/file\/[^"']+/,
    /https:\/\/[\w-]+\.1024tera\.com\/[^"']+/,
    /https:\/\/[\w-]+\.4funbox\.com\/[^"']+/
  ];
  for (let r of regexes) {
    const m = html.match(r);
    if (m) return m[0];
  }
  return null;
}

app.get("/", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ ok: false, error: "Missing ?url=" });

  let target = url.trim();

  try {
    // Handle share links
    if (/terabox\.com\/s\//.test(target) || /1024tera\.com\/s\//.test(target)) {
      const html = await fetch(target).then((r) => r.text());
      const dataLink = extractDataLink(html);
      if (!dataLink)
        return res.json({ ok: false, error: "Could not extract direct file link from share page (Terabox updated HTML)." });
      target = dataLink;
    }

    // Validate
    if (!/https:\/\/data\./.test(target))
      return res.json({ ok: false, error: "Invalid direct link." });

    // Try mirrors for playable link
    for (const domain of MIRRORS) {
      const testUrl = target.replace(/data\.[^/]+/, domain);
      try {
        const r = await fetch(testUrl, { redirect: "manual" });
        const type = r.headers.get("content-type") || "";
        if (r.ok && !type.includes("json")) {
          return res.json({
            ok: true,
            video_title: testUrl.split("/").pop(),
            download_url: testUrl
          });
        }
      } catch {}
    }

    return res.json({ ok: false, error: "All mirrors returned sign error or expired link." });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(3000, () => console.log("terafetchs fixed API running..."));
export default app;
