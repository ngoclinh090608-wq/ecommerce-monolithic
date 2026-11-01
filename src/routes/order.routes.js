const express = require("express");

const prisma = require("../lib/prisma");
const { authRequired } = require("../middlewares/auth");

const router = express.Router();

// POST /api/orders
router.post("/", authRequired, async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "items are required"
      });
    }

    for (const item of items) {
      if (
        !Number.isInteger(Number(item.pid)) ||
        !Number.isInteger(Number(item.qty)) ||
        Number(item.qty) <= 0
      ) {
        return res.status(400).json({
          message: "Invalid order item"
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const preparedItems = [];

      for (const item of items) {
        const pid = Number(item.pid);
        const qty = Number(item.qty);

        const product = await tx.product.findUnique({
          where: { pid }
        });

        if (!product) {
          const error = new Error(`Product ${pid} not found`);
          error.statusCode = 404;
          throw error;
        }

        if (product.quantity < qty) {
          const error = new Error(
            `Insufficient stock for product ${product.pname}`
          );
          error.statusCode = 409;
          throw error;
        }

        preparedItems.push({
          product,
          qty
        });
      }

      const order = await tx.order.create({
        data: {
          uid: req.user.uid
        }
      });

      for (const item of preparedItems) {
        await tx.orderDetail.create({
          data: {
            oid: order.oid,
            pid: item.product.pid,
            qty: item.qty,
            unit_price: item.product.price
          }
        });

        await tx.product.update({
          where: {
            pid: item.product.pid
          },
          data: {
            quantity: {
              decrement: item.qty
            }
          }
        });
      }

      const shipment = await tx.shipment.create({
        data: {
          oid: order.oid,
          status: "PENDING"
        }
      });

      return {
        order,
        shipment
      };
    });

    const createdOrder = await prisma.order.findUnique({
      where: {
        oid: result.order.oid
      },
      include: {
        orderDetails: {
          include: {
            product: true
          }
        },
        shipments: true
      }
    });

    res.status(201).json(createdOrder);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders
router.get("/", authRequired, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        uid: req.user.uid
      },
      include: {
        orderDetails: {
          include: {
            product: true
          }
        },
        shipments: true
      },
      orderBy: {
        oid: "desc"
      }
    });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id
router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const oid = Number(req.params.id);

    if (!Number.isInteger(oid) || oid <= 0) {
      return res.status(400).json({
        message: "Invalid order id"
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        oid,
        uid: req.user.uid
      },
      include: {
        orderDetails: {
          include: {
            product: true
          }
        },
        shipments: true
      }
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;