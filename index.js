import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🚀 RapidAPI credentials
const RAPID_KEY = process.env.RAPIDAPI_KEY; // set this in Vercel environment variables
const RAPID_HOST = "terabox-link-api.p.rapidapi.com"; // or check RapidAPI docs if host differs

app.get("/", async (req, res) => {
  const { url } = req.query;

  if (!url)
    return res.status(400).json({ ok: false, error: "Missing ?url parameter" });

  try {
    const apiUrl = `https://${RAPID_HOST}/direct?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      headers: {
        "x-rapidapi-key": RAPID_KEY,
        "x-rapidapi-host": RAPID_HOST,
      },
    });

    const data = await response.json();

    // Example success: { status:"success", direct_link:"https://...", filename:"video.mp4" }
    if (data && data.status === "success") {
      return res.json({
        ok: true,
        video_title: data.filename || "Terabox Video",
        download_url: data.direct_link,
      });
    }

    return res.json({
      ok: false,
      error: data.message || "Failed to fetch link from RapidAPI endpoint.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: "Server error: " + err.message });
  }
});

app.listen(3000, () => console.log("✅ terafetchs + RapidAPI live!"));
export default app;
