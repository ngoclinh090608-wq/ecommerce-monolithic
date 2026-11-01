const express = require("express");

const prisma = require("../lib/prisma");
const {
  authRequired,
  adminRequired
} = require("../middlewares/auth");

const router = express.Router();

// GET /api/products
router.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        pid: "asc"
      }
    });

    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res, next) => {
  try {
    const pid = Number(req.params.id);

    if (!Number.isInteger(pid) || pid <= 0) {
      return res.status(400).json({
        message: "Invalid product id"
      });
    }

    const product = await prisma.product.findUnique({
      where: { pid }
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
});

// POST /api/products
router.post(
  "/",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const { pname, price, quantity } = req.body;

      if (!pname || price === undefined || quantity === undefined) {
        return res.status(400).json({
          message: "pname, price and quantity are required"
        });
      }

      const numericPrice = Number(price);
      const numericQuantity = Number(quantity);

      if (
        Number.isNaN(numericPrice) ||
        numericPrice < 0 ||
        !Number.isInteger(numericQuantity) ||
        numericQuantity < 0
      ) {
        return res.status(400).json({
          message: "Invalid price or quantity"
        });
      }

      const product = await prisma.product.create({
        data: {
          pname,
          price: numericPrice,
          quantity: numericQuantity
        }
      });

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/products/:id
router.put(
  "/:id",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const pid = Number(req.params.id);
      const { pname, price, quantity } = req.body;

      if (!Number.isInteger(pid) || pid <= 0) {
        return res.status(400).json({
          message: "Invalid product id"
        });
      }

      const existedProduct = await prisma.product.findUnique({
        where: { pid }
      });

      if (!existedProduct) {
        return res.status(404).json({
          message: "Product not found"
        });
      }

      const data = {};

      if (pname !== undefined) {
        data.pname = pname;
      }

      if (price !== undefined) {
        const numericPrice = Number(price);

        if (Number.isNaN(numericPrice) || numericPrice < 0) {
          return res.status(400).json({
            message: "Invalid price"
          });
        }

        data.price = numericPrice;
      }

      if (quantity !== undefined) {
        const numericQuantity = Number(quantity);

        if (!Number.isInteger(numericQuantity) || numericQuantity < 0) {
          return res.status(400).json({
            message: "Invalid quantity"
          });
        }

        data.quantity = numericQuantity;
      }

      const product = await prisma.product.update({
        where: { pid },
        data
      });

      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/products/:id
router.delete(
  "/:id",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const pid = Number(req.params.id);

      if (!Number.isInteger(pid) || pid <= 0) {
        return res.status(400).json({
          message: "Invalid product id"
        });
      }

      const existedProduct = await prisma.product.findUnique({
        where: { pid }
      });

      if (!existedProduct) {
        return res.status(404).json({
          message: "Product not found"
        });
      }

      await prisma.product.delete({
        where: { pid }
      });

      res.status(200).json({
        message: "Product deleted successfully"
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;