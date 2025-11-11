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

// Improved link extraction (new Terabox HTML as of Nov 2025)
function extractDataLink(html) {
  const patterns = [
    /"dlink"\s*:\s*"([^"]+)"/,
    /"playurl"\s*:\s*"([^"]+)"/,
    /https:\/\/data[^"']+\/file\/[^"']+/,
    /https:\/\/[\w-]+\.1024tera\.com\/[^"']+/,
    /https:\/\/[\w-]+\.4funbox\.com\/[^"']+/
  ];

  for (const r of patterns) {
    const m = html.match(r);
    if (m && m[1]) {
      let url = m[1];
      try {
        url = decodeURIComponent(url.replace(/\\u002F/g, "/"));
      } catch {}
      return url;
    } else if (m && !m[1]) {
      // Handle if regex doesn't have a capture group
      return m[0];
    }
  }

  // Try fallback: sometimes link is inside JSON "download link" or "url"
  try {
    const jsonMatch = html.match(/{"dlink":"(https:[^"]+)"/);
    if (jsonMatch && jsonMatch[1]) return jsonMatch[1];
  } catch {}

  return null;
}

app.get("/", async (req, res) => {
  const { url } = req.query;
  if (!url)
    return res
      .status(400)
      .json({ ok: false, error: "Missing ?url parameter" });

  let target = url.trim();

  try {
    // Handle share links
    if (
      /terabox\.com\/s\//.test(target) ||
      /1024tera\.com\/s\//.test(target) ||
      /gibibox\.com\/s\//.test(target)
    ) {
      const html = await fetch(target, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
        },
      }).then((r) => r.text());

      const dataLink = extractDataLink(html);
      if (!dataLink) {
        return res.json({
          ok: false,
          error:
            "Could not extract playable link from this Terabox page (Terabox may have changed structure again).",
        });
      }
      target = dataLink;
    }

    // Validate final link
    if (!/^https:\/\/data\./.test(target)) {
      return res.json({
        ok: false,
        error: "Invalid or unsupported Terabox direct link.",
      });
    }

    // Try mirrors
    for (const domain of MIRRORS) {
      const testUrl = target.replace(/data\.[^/]+/, domain);
      try {
        const response = await fetch(testUrl, { redirect: "manual" });
        const contentType = response.headers.get("content-type") || "";
        if (response.ok && !contentType.includes("json")) {
          return res.json({
            ok: true,
            video_title: decodeURIComponent(
              testUrl.split("/").pop().split("?")[0]
            ),
            download_url: testUrl,
          });
        }
      } catch {
        // try next mirror
        continue;
      }
    }

    return res.json({
      ok: false,
      error:
        "All mirrors failed or the link has expired. Try refreshing the Terabox share link.",
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error: " + err.message,
    });
  }
});

app.listen(3000, () =>
  console.log("✅ terafetchs API (stable fix) is running...")
);
export default app;
