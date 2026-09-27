const express = require("express");
const SSLCommerzPayment = require("sslcommerz-lts");
const mongoose = require("mongoose");
const { randomBytes, timingSafeEqual } = require("crypto");
const auth = require("../middleware/authMiddleware");
const Event = require("../models/Event");
const User = require("../models/User");
const Order = require("../models/Order");
const { buildCart, verifiedPayment } = require("../utils/paymentRules.js");
const router = express.Router();
const sandbox = "https://sandbox.sslcommerz.com";
const frontend = () =>
  (process.env.ALLOWED_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
const resultUrl = (id) =>
  `${frontend()}/purchase-success?transactionId=${encodeURIComponent(id)}`;

function credentials() {
  if (process.env.SSL_IS_LIVE === "true")
    throw new Error("This integration is sandbox-only. Set SSL_IS_LIVE=false.");
  if (!process.env.SSL_STORE_ID || !process.env.SSL_STORE_PASSWORD)
    throw new Error("SSLCommerz sandbox credentials are not configured.");
  return {
    store_id: process.env.SSL_STORE_ID,
    store_passwd: process.env.SSL_STORE_PASSWORD,
  };
}
async function gateway(path, data, post = false) {
  const config = credentials();
  if (post) {
    // Same SDK initialization used by the CSE2200 payment-gateway-demo.
    const sslcz = new SSLCommerzPayment(
      config.store_id,
      config.store_passwd,
      false,
    );
    let timer;
    try {
      const result = await Promise.race([
        sslcz.init(data),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error("Payment gateway timed out.");
            error.name = "TimeoutError";
            reject(error);
          }, 20000);
        }),
      ]);
      // The SDK resolves network errors instead of rejecting them.
      if (!result || result instanceof Error)
        throw new Error("Payment gateway is unavailable.");
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
  // sslcommerz-lts 1.2.0 hardcodes POST in its transport, including validate().
  // Use the documented GET validation endpoint to independently verify payments.
  const params = new URLSearchParams({ ...config, ...data });
  const response = await fetch(`${sandbox}${path}${post ? "" : `?${params}`}`, {
    method: post ? "POST" : "GET",
    signal: AbortSignal.timeout(20000),
    ...(post ? { body: params } : {}),
  });
  if (!response.ok)
    throw new Error("Payment gateway is unavailable. Please try again.");
  return response.json();
}
function receipt(order) {
  const {
    transactionId,
    eventId,
    eventTitle,
    eventImage,
    eventDate,
    eventLocation,
    items,
    quantity,
    total,
    status,
    purchasedAt,
  } = order;
  return {
    id: transactionId,
    transactionId,
    eventId,
    eventTitle,
    eventImage,
    eventDate,
    eventLocation,
    items,
    quantity,
    total,
    status,
    purchasedAt,
  };
}
async function validate(order, valId) {
  if (typeof valId !== "string" || !valId || valId.length > 200) return false;
  const result = await gateway("/validator/api/validationserverAPI.php", {
    val_id: valId,
    format: "json",
    v: "1",
  });
  if (!verifiedPayment(order, result)) return false;
  // Atomic update makes repeated browser callbacks and IPNs harmless.
  await Order.updateOne(
    { _id: order._id, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        validationId: valId,
        bankTransactionId: result.bank_tran_id,
        purchasedAt: new Date(),
      },
    },
  );
  return true;
}

router.post("/checkout", auth, async (req, res) => {
  let order;
  try {
    if (req.user.role !== "user")
      return res
        .status(403)
        .json({ message: "Only regular users can buy tickets." });
    const { eventId, items, phone, address } = req.body;
    if (!mongoose.isValidObjectId(eventId))
      return res.status(400).json({ message: "Invalid event." });
    const event = await Event.findOne({ _id: eventId, status: "Approved" });
    if (!event)
      return res.status(404).json({ message: "This event is unavailable." });
    let cart;
    try {
      cart = buildCart(event, items);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const user = await User.findById(req.user.userId);
    if (!user)
      return res.status(401).json({ message: "Please sign in again." });
    if (cart.total > 0) {
      if (
        typeof phone !== "string" ||
        !/^\+?[0-9 -]{7,20}$/.test(phone.trim()) ||
        typeof address !== "string" ||
        !address.trim() ||
        address.length > 200
      ) {
        return res
          .status(400)
          .json({ message: "Enter a valid phone number and billing address." });
      }
      credentials();
      const callbackBase = new URL(process.env.API_BASE_URL || "");
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(
        callbackBase.hostname,
      );
      if (
        callbackBase.protocol !== "https:" &&
        !(local && callbackBase.protocol === "http:")
      )
        throw new Error("Use HTTPS or a localhost callback URL.");
    }
    const transactionId = new mongoose.Types.ObjectId().toString();
    const token = randomBytes(32).toString("hex");
    order = await Order.create({
      transactionId,
      user: user._id,
      eventId: event._id,
      eventTitle: event.title,
      eventImage: event.bannerImage.url,
      eventDate: event.date,
      eventLocation: event.location,
      ...cart,
      callbackToken: token,
      ...(cart.total === 0 ? { status: "paid", purchasedAt: new Date() } : {}),
    });
    if (cart.total === 0)
      return res.json({ redirectUrl: resultUrl(transactionId) });
    const base = process.env.API_BASE_URL.replace(/\/$/, "");
    const callback = (status) =>
      `${base}/payments/callback/${status}/${transactionId}?token=${token}`;
    const result = await gateway(
      "/gwprocess/v4/api.php",
      {
        total_amount: cart.total.toFixed(2),
        currency: "BDT",
        tran_id: transactionId,
        success_url: callback("success"),
        fail_url: callback("failed"),
        cancel_url: callback("cancelled"),
        ...(!["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(base).hostname,
        )
          ? { ipn_url: `${base}/payments/ipn` }
          : {}),
        shipping_method: "NO",
        num_of_item: cart.quantity,
        product_name: event.title.slice(0, 200),
        product_category: "Event tickets",
        product_profile: "non-physical-goods",
        cus_name: user.name,
        cus_email: user.email,
        cus_phone: phone.trim(),
        cus_add1: address.trim(),
        cus_city: "N/A",
        cus_postcode: "N/A",
        cus_country: "Bangladesh",
      },
      true,
    );
    const url = new URL(result.GatewayPageURL || sandbox);
    if (
      result.status !== "SUCCESS" ||
      !result.GatewayPageURL ||
      url.protocol !== "https:" ||
      !(
        url.hostname === "sslcommerz.com" ||
        url.hostname.endsWith(".sslcommerz.com")
      )
    ) {
      throw new Error(
        "Could not start SSLCommerz checkout. Check the sandbox configuration.",
      );
    }
    res.json({ paymentUrl: url.href, transactionId });
  } catch (error) {
    if (order)
      await Order.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "failed" } },
      );
    res.status(503).json({
      message:
        error.name === "TimeoutError"
          ? "Payment gateway timed out. Please try again."
          : "Unable to start payment. Check the sandbox configuration and try again.",
    });
  }
});

router.post("/callback/:outcome/:transactionId", async (req, res) => {
  const { outcome, transactionId } = req.params;
  if (!["success", "failed", "cancelled"].includes(outcome))
    return res.sendStatus(404);
  try {
    const order = await Order.findOne({ transactionId }).select(
      "+callbackToken",
    );
    const supplied = typeof req.query.token === "string" ? req.query.token : "";
    if (
      !order ||
      !order.callbackToken ||
      supplied.length !== order.callbackToken.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(order.callbackToken))
    )
      return res.sendStatus(400);
    if (outcome === "success") await validate(order, req.body.val_id);
    else
      await Order.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: outcome } },
      );
    return res.redirect(303, resultUrl(transactionId));
  } catch {
    // A later IPN can complete verification; never report an unverified purchase as paid.
    return res.redirect(303, resultUrl(transactionId));
  }
});
router.post("/ipn", async (req, res) => {
  try {
    if (typeof req.body.tran_id !== "string") return res.sendStatus(400);
    const order = await Order.findOne({ transactionId: req.body.tran_id });
    if (!order || !(await validate(order, req.body.val_id)))
      return res.sendStatus(400);
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});
router.get("/orders", auth, async (req, res) => {
  const orders = await Order.find({ user: req.user.userId, status: "paid" })
    .sort({ purchasedAt: -1 })
    .limit(100);
  res.json({ orders: orders.map(receipt) });
});
router.get("/orders/:transactionId", auth, async (req, res) => {
  const order = await Order.findOne({
    transactionId: req.params.transactionId,
    user: req.user.userId,
  });
  if (!order)
    return res
      .status(404)
      .json({ message: "Order not found for this account." });
  // Local demos cannot receive server-to-server IPNs. Reconcile on owner status requests.
  if (order.status !== "paid" && order.total > 0) {
    try {
      const query = await gateway(
        "/validator/api/merchantTransIDvalidationAPI.php",
        {
          tran_id: order.transactionId,
          format: "json",
        },
      );
      const transactions = Array.isArray(query.element) ? query.element : [];
      const candidate = transactions.find(
        (item) =>
          item.tran_id === order.transactionId &&
          ["VALID", "VALIDATED"].includes(item.status),
      );
      if (candidate && (await validate(order, candidate.val_id))) {
        const confirmed = await Order.findOne({
          transactionId: order.transactionId,
          user: req.user.userId,
        });
        return res.json({ order: receipt(confirmed) });
      }
    } catch {
      return res
        .status(503)
        .json({
          message:
            "Could not verify payment with SSLCommerz. Refresh status before paying again.",
        });
    }
  }
  res.json({ order: receipt(order) });
});
module.exports = router;
