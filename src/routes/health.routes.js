const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "UP",
    message: "Application is healthy"
  });
});

router.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "READY",
      database: "UP"
    });
  } catch (error) {
    res.status(503).json({
      status: "NOT_READY",
      database: "DOWN"
    });
  }
});

module.exports = router;