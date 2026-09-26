function buildCart(event, requested) {
  if (!Array.isArray(requested) || !requested.length || requested.length > 10)
    throw new Error("Select between 1 and 10 tickets.");
  const seen = new Set();
  const items = requested.map(({ ticketId, quantity }) => {
    const ticket = event.tickets.find((t) => String(t._id) === ticketId);
    if (
      !ticket ||
      seen.has(ticketId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    )
      throw new Error("Invalid ticket selection.");
    seen.add(ticketId);
    const cents = Math.round(ticket.price * 100);
    if (!Number.isSafeInteger(cents) || cents < 0)
      throw new Error("Invalid ticket price.");
    return {
      ticketId,
      ticketName: ticket.name,
      unitPrice: cents / 100,
      quantity,
    };
  });
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const amount = items.reduce(
    (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
    0,
  );
  if (quantity > 10 || !Number.isSafeInteger(amount))
    throw new Error("Maximum 10 tickets per checkout.");
  return { items, quantity, total: amount / 100 };
}

function verifiedPayment(order, result) {
  return (
    ["VALID", "VALIDATED"].includes(result.status) &&
    result.tran_id === order.transactionId &&
    result.currency === "BDT" &&
    Number.isFinite(Number(result.amount)) &&
    Math.round(Number(result.amount) * 100) === Math.round(order.total * 100) &&
    String(result.risk_level) === "0"
  );
}
module.exports = { buildCart, verifiedPayment };
