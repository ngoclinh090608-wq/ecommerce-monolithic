const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../lib/prisma");
const env = require("../config/env");
const { authRequired } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { username, fullname, password } = req.body;

    if (!username || !fullname || !password) {
      return res.status(400).json({
        message: "username, fullname and password are required"
      });
    }

    const existedUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existedUser) {
      return res.status(409).json({
        message: "Username already exists"
      });
    }

    const normalRole = await prisma.role.findUnique({
      where: { rolename: "normal" }
    });

    const normalMembership = await prisma.memberShip.findFirst({
      where: { score: 10 }
    });

    if (!normalRole || !normalMembership) {
      return res.status(500).json({
        message: "Default role or membership not found"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        fullname,
        password: hashedPassword,
        roleid: normalRole.roleid,
        mid: normalMembership.mid
      },
      select: {
        uid: true,
        username: true,
        fullname: true,
        role: {
          select: {
            rolename: true
          }
        },
        membership: {
          select: {
            mname: true,
            score: true
          }
        }
      }
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "username and password are required"
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        membership: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    const passwordMatched = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    const token = jwt.sign(
      {
        uid: user.uid,
        username: user.username,
        role: user.role.rolename
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN
      }
    );

    res.status(200).json({
      token
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        uid: req.user.uid
      },
      select: {
        uid: true,
        username: true,
        fullname: true,
        role: {
          select: {
            rolename: true
          }
        },
        membership: {
          select: {
            mname: true,
            score: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;