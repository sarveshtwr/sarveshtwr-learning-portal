require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sanitizeHtml = require("sanitize-html");

const { Admin, Chapter } = require("./models");
const { requireAdmin } = require("./auth");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error("Missing MONGODB_URI or JWT_SECRET. Configure your .env file.");
  process.exit(1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const allowed = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(
        new Error("This website origin is not allowed by the API CORS policy."),
      );
    },
  }),
);

app.use(express.json({ limit: "2mb" }));

app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "SARVESHTWR Learning Portal API",
  });
});

// =====================================
// ADVANCED CONTENT SANITIZER
// =====================================

const allowedTags = [
  ...new Set([
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "u",
    "h2",
    "h3",
    "h4",
    "span",
    "div",
    "hr",
  ]),
];

const allowedAttributes = {
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading", "style"],
  figure: ["class"],
  figcaption: ["class"],
  "*": ["class"],
};

const allowedStyles = {
  img: {
    width: [/^(25|50|75|100)%$/, /^\d+px$/],
    "max-width": [/^100%$/],
    height: [/^auto$/, /^\d+px$/],
    display: [/^block$/, /^inline-block$/],
    "margin-left": [/^0$/, /^auto$/],
    "margin-right": [/^0$/, /^auto$/],
  },
};

function cleanContent(html) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedStyles,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["https", "http"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}

function validImageUrl(url) {
  if (!url) return true;

  return /^https:\/\/|^assets\/[a-zA-Z0-9._/-]+$/i.test(url);
}

function cleanSlug(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 170);
}

function validateChapter(body) {
  const title = String(body.title || "").trim();
  const slug = cleanSlug(body.slug || title);
  const className = String(body.className || "");
  const subject = String(body.subject || "").trim();

  const contentHtml = cleanContent(String(body.contentHtml || ""));

  if (!title || title.length > 150) {
    throw new Error("Enter a chapter title (maximum 150 characters).");
  }

  if (!slug) {
    throw new Error("Enter a valid chapter URL slug.");
  }

  if (!["9", "10", "11", "12"].includes(className)) {
    throw new Error("Choose Class 9, 10, 11 or 12.");
  }

  if (!subject || subject.length > 80) {
    throw new Error("Enter a subject (maximum 80 characters).");
  }

  if (!contentHtml || contentHtml.length > 500000) {
    throw new Error("Chapter content is empty or too large.");
  }

  if (!validImageUrl(body.coverImage)) {
    throw new Error("Cover image must use https:// or an assets/ path.");
  }

  return {
    title,
    slug,
    className,
    subject,
    chapterNumber: String(body.chapterNumber || "")
      .trim()
      .slice(0, 30),
    description: String(body.description || "")
      .trim()
      .slice(0, 300),
    coverImage: String(body.coverImage || "").trim(),
    contentHtml,
  };
}

// =====================================
// ADMIN AUTHENTICATION
// =====================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    const admin = await Admin.findOne({ email });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      });
    }

    const token = jwt.sign(
      { sub: admin._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      admin: { email: admin.email },
    });
  } catch (e) {
    res.status(500).json({
      message: "Unable to sign in.",
    });
  }
});

app.get("/api/auth/me", requireAdmin, (req, res) => {
  res.json({
    admin: { email: req.admin.email },
  });
});

// =====================================
// PUBLIC CHAPTER API
// =====================================

app.get("/api/chapters", async (req, res) => {
  try {
    const filter = {};

    if (["9", "10", "11", "12"].includes(String(req.query.className))) {
      filter.className = String(req.query.className);
    }

    if (req.query.subject) {
      filter.subject = String(req.query.subject).slice(0, 80);
    }

    if (req.query.q) {
      filter.$text = {
        $search: String(req.query.q).slice(0, 100),
      };
    }

    const chapters = await Chapter.find(filter)
      .select(
        "title slug className subject chapterNumber description coverImage createdAt updatedAt",
      )
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean();

    res.json({ chapters });
  } catch (e) {
    res.status(500).json({
      message: "Could not load chapters.",
    });
  }
});

app.get("/api/chapters/:slug", async (req, res) => {
  try {
    const chapter = await Chapter.findOne({
      slug: cleanSlug(req.params.slug),
    }).lean();

    if (!chapter) {
      return res.status(404).json({
        message: "Chapter not found.",
      });
    }

    res.json({ chapter });
  } catch (e) {
    res.status(500).json({
      message: "Could not load chapter.",
    });
  }
});

// =====================================
// ADMIN CHAPTER MANAGEMENT
// =====================================

app.post("/api/chapters", requireAdmin, async (req, res) => {
  try {
    const data = validateChapter(req.body);
    const chapter = await Chapter.create(data);

    res.status(201).json({ chapter });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 400).json({
      message:
        e.code === 11000 ? "That chapter URL slug already exists." : e.message,
    });
  }
});

app.put("/api/chapters/:id", requireAdmin, async (req, res) => {
  try {
    const data = validateChapter(req.body);

    const chapter = await Chapter.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!chapter) {
      return res.status(404).json({
        message: "Chapter not found.",
      });
    }

    res.json({ chapter });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 400).json({
      message:
        e.code === 11000 ? "That chapter URL slug already exists." : e.message,
    });
  }
});

app.delete("/api/chapters/:id", requireAdmin, async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndDelete(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        message: "Chapter not found.",
      });
    }

    res.json({
      message: "Chapter deleted.",
    });
  } catch (e) {
    res.status(400).json({
      message: "Could not delete chapter.",
    });
  }
});

// =====================================
// ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(403).json({
    message: "Request blocked by API security settings. Check CLIENT_ORIGINS.",
  });
});

// =====================================
// DATABASE CONNECTION
// =====================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`SARVESHTWR API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
