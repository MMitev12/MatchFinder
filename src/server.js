import rateLimit from "express-rate-limit";

const axios = require("axios");
const cors = require("cors");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;

const teamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({
      error: "Прекалено много заявки, моля опитайте отново по-късно",
    });
  },
});

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());
app.use("/api/teams/:id", teamLimiter);

// Date Filters
app.get("/api/matches", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: "Липсват данни за датата!" });
    }

    const startDate = new Date(`${dateFrom}T00:00:00Z`).toISOString();
    const endDate = new Date(`${dateTo}T23:59:59Z`).toISOString();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Грешен формат на датата." });
    }

    if (startDate > endDate) {
      return res
        .status(400)
        .json({ error: "Началната дата трябва да е преди крайната дата." });
    }

    const response = await axios.get(
      `${process.env.FOOTBALL_API_URL}/matches`,
      {
        params: {
          dateFrom: startDate,
          dateTo: endDate,
        },
        headers: {
          "X-Auth-Token": process.env.API_KEY,
        },
      }
    );

    const filteredMatches = response.data.matches.filter((match) => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= startDate && matchDate <= endDate;
    });

    res.json({ matches: filteredMatches });
  } catch (error) {
    res.status(500).json({
      error: "Неуспешно извличане на мачове.",
      details: error.message,
    });
  }
});

app.get("/api/teams/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.FOOTBALL_API_URL}/teams/${req.params.id}`,
      {
        headers: { "X-Auth-Token": process.env.API_KEY },
      }
    );
    res.json({ venue: response.data.venue });
  } catch (error) {
    res.status(500).json({ error: "Не е намерен отбор!" });
  }
});

app.listen(PORT, () => {
  console.log(`Сървърът работи на порт ${PORT}`);
});

app.use((err, req, res, next) => {
  res.status(500).json({
    error: "Вътрешна грешка на сървъра!!!",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});
