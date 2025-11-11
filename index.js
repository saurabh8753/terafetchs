import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// RapidAPI credentials
const RAPID_KEY = process.env.RAPIDAPI_KEY; // store your key in Vercel env
const RAPID_HOST = "terabox-downloader-direct-download-link-generator2.p.rapidapi.com";
const RAPID_ENDPOINT = `https://${RAPID_HOST}/url`;

app.get("/", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ ok: false, error: "Missing ?url parameter" });
  }

  try {
    // Build API request
    const apiUrl = `${RAPID_ENDPOINT}?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, {
      headers: {
        "x-rapidapi-key": RAPID_KEY,
        "x-rapidapi-host": RAPID_HOST,
      },
    });

    const data = await response.json();

    // Example success structure from RapidAPI:
    // { "status":"success", "direct_link":"https://...", "filename":"video.mp4" }
    if (data && data.status === "success") {
      return res.json({
        ok: true,
        video_title: data.filename || "Terabox Video",
        download_url: data.direct_link,
      });
    }

    // If response format differs or fails
    return res.json({
      ok: false,
      error: data.message || data.error || "Failed to get direct link from RapidAPI endpoint.",
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
});

app.listen(3000, () => console.log("✅ terafetchs RapidAPI endpoint live"));
export default app;
