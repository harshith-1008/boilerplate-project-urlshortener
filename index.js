require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");
const { URL } = require("url");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true },
});

const Url = mongoose.model("Url", urlSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isValidUrl = async (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    const lookupAsync = () => {
      return new Promise((resolve, reject) => {
        dns.lookup(hostname, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await lookupAsync();
    return true;
  } catch (err) {
    return false;
  }
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.post("/api/shorturl", async (req, res) => {
  const { url } = req.body;

  if (!(await isValidUrl(url))) {
    return res.json({ error: "invalid url" });
  }

  try {
    const existingUrl = await Url.findOne({
      original_url: url,
    });

    if (existingUrl) {
      res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    } else {
      const count = await Url.countDocuments({});
      const newUrl = await Url.create({
        original_url: url,
        short_url: count + 1,
      });

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url,
      });
    }
  } catch (err) {
    console.error("error while generating short url", err);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/api/shorturl/:urlno", async (req, res) => {
  const { urlno } = req.params;

  try {
    const getOriginal = await Url.findOne({ short_url: urlno });
    if (!getOriginal) {
      return res.status(404).json({ error: "short url not found in database" });
    }
    res.redirect(getOriginal.original_url);
  } catch (err) {
    console.error("error occured while getting original url", err);
    res.status(500).json({ error: "server error" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
