const express = require("express");

const prisma = require("../lib/prisma");
const {
  authRequired,
  adminRequired
} = require("../middlewares/auth");

const router = express.Router();

// GET /api/shipments/:id
router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const shipid = Number(req.params.id);

    const shipment = await prisma.shipment.findUnique({
      where: { shipid },
      include: {
        order: true
      }
    });

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found"
      });
    }

    if (
      req.user.role !== "admin" &&
      shipment.order.uid !== req.user.uid
    ) {
      return res.status(403).json({
        message: "Forbidden"
      });
    }

    res.status(200).json(shipment);
  } catch (error) {
    next(error);
  }
});

// PUT /api/shipments/:id
router.put(
  "/:id",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const shipid = Number(req.params.id);
      const { status } = req.body;

      const allowedStatuses = [
        "PENDING",
        "SHIPPING",
        "DELIVERED"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid shipment status"
        });
      }

      const existedShipment = await prisma.shipment.findUnique({
        where: { shipid }
      });

      if (!existedShipment) {
        return res.status(404).json({
          message: "Shipment not found"
        });
      }

      const shipment = await prisma.shipment.update({
        where: { shipid },
        data: { status }
      });

      res.status(200).json(shipment);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;