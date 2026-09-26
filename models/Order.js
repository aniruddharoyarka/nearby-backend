const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    eventTitle: String,
    eventImage: String,
    eventDate: String,
    eventLocation: String,
    items: [
      {
        ticketId: String,
        ticketName: String,
        unitPrice: Number,
        quantity: Number,
      },
    ],
    quantity: Number,
    total: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    validationId: String,
    bankTransactionId: String,
    purchasedAt: Date,
    callbackToken: { type: String, select: false },
  },
  { timestamps: true },
);
module.exports = mongoose.model("Order", orderSchema);
