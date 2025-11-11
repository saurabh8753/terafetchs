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

// Extract the playable URL from updated Terabox/1024tera HTML
function extractDataLink(html) {
  // newer Terabox structure uses playurl or dlink in JSON inside the HTML
  const patterns = [
    /"dlink":"(https:[^"]+)"/,
    /"playurl":"(https:[^"]+)"/,
    /https:\/\/data[^"']+\/file\/[^"']+/,
    /https:\/\/[\w-]+\.1024tera\.com\/[^"']+/,
    /https:\/\/[\w-]+\.4funbox\.com\/[^"']+/
  ];
  for (const regex of patterns) {
    const match = html.match(regex);
    if (match) {
      return decodeURIComponent(match[1].replace(/\\u002F/g, "/"));
    }
  }
  return null;
}

app.get("/", async (req, res) => {
  const { url } = req.query;
  if (!url)
    return res.status(400).json({ ok: false, error: "Missing ?url parameter" });

  let target = url.trim();

  try {
    // If it's a share link, fetch HTML and extract dlink
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
            "Could not extract direct file link from updated Terabox share page.",
        });
      }
      target = dataLink;
    }

    // Validate direct link
    if (!/^https:\/\/data\./.test(target)) {
      return res.json({
        ok: false,
        error: "Invalid or unsupported Terabox link.",
      });
    }

    // Try multiple mirror domains
    for (const domain of MIRRORS) {
      const testUrl = target.replace(/data\.[^/]+/, domain);
      try {
        const response = await fetch(testUrl, { redirect: "manual" });
        const type = response.headers.get("content-type") || "";
        if (response.ok && !type.includes("json")) {
          return res.json({
            ok: true,
            video_title: decodeURIComponent(
              testUrl.split("/").pop().split("?")[0]
            ),
            download_url: testUrl,
          });
        }
      } catch (e) {
        continue; // try next domain
      }
    }

    return res.json({
      ok: false,
      error:
        "All mirrors returned sign error or expired link. Try refreshing the page or another link.",
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "Internal error: " + e.message });
  }
});

app.listen(3000, () => console.log("✅ terafetchs API (Nov 2025) running..."));
export default app;
