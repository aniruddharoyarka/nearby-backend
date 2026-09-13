const { cleanAddress, formatAddress } = require("../utils/listingAddress");
const mongoose = require("mongoose");
const Offer = require("../models/Offer");
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
const publicFilter = () => ({
  status: "Approved",
  validUntil: { $gte: today() },
});
const populate = "name organizationName profilePicture";
const serialize = (o) => ({
  id: o._id,
  title: o.title,
  category: o.category,
  location: o.location,
  address: o.address,
  date: o.date,
  time: o.time,
  validUntil: o.validUntil,
  description: o.description,
  redemption: o.redemption,
  originalPrice: o.originalPrice,
  discountPercent: o.discountPercent,
  discount: o.discountPercent + "% off",
  offerPrice: Math.round(o.originalPrice * (100 - o.discountPercent)) / 100,
  bannerImage: o.bannerImage,
  image: o.bannerImage.url,
  type: "offer",
  status: o.status,
  rejectionReason: o.rejectionReason,
  organizer: o.organizer?.name
    ? {
        id: o.organizer._id,
        name: o.organizer.organizationName || o.organizer.name,
        profilePicture: { url: o.organizer.profilePicture?.url },
      }
    : null,
  createdAt: o.createdAt,
});
const validate = (body) => {
  const data = {};
  for (const key of [
    "title",
    "category",
    "location",
    "date",
    "time",
    "validUntil",
    "description",
    "redemption",
  ]) {
    if (typeof body[key] !== "string" || !body[key].trim())
      throw new Error(key + " is required.");
    data[key] = body[key].trim();
  }
  for (const key of ["date", "validUntil"]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data[key]) ||
      !Number.isFinite(Date.parse(data[key])) ||
      new Date(data[key]).toISOString().slice(0, 10) !== data[key]
    )
      throw new Error("Choose a valid date.");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time))
    throw new Error("Choose a valid time.");
  if (data.validUntil < data.date || data.validUntil < today())
    throw new Error("Expiry must be on or after the start date and today.");
  for (const key of ["originalPrice", "discountPercent"]) {
    if (
      !["number", "string"].includes(typeof body[key]) ||
      String(body[key]).trim() === ""
    )
      throw new Error("Price and discount are required.");
    data[key] = Number(body[key]);
    if (!Number.isFinite(data[key]) || data[key] < 0)
      throw new Error("Price and discount must be non-negative numbers.");
  }
  if (data.discountPercent > 100)
    throw new Error("Discount cannot exceed 100%.");
  if (
    typeof body.bannerImage?.url !== "string" ||
    !/^https:\/\//.test(body.bannerImage.url) ||
    typeof body.bannerImage.publicId !== "string" ||
    !body.bannerImage.publicId.trim()
  )
    throw new Error("Upload an offer banner.");
  data.bannerImage = {
    url: body.bannerImage.url,
    publicId: body.bannerImage.publicId.trim(),
  };
  data.address = cleanAddress(body.address);
  if (data.address) data.location = formatAddress(data.address);
  return data;
};
const list = (scope) => async (req, res) => {
  try {
    const filter =
      scope === "admin"
        ? {}
        : scope === "mine"
          ? { organizer: req.user.userId }
          : publicFilter();
    const offers = await Offer.find(filter)
      .populate("organizer", populate)
      .sort({ createdAt: -1 });
    res.json({ offers: offers.map(serialize) });
  } catch {
    res.status(500).json({ message: "Failed to load offers." });
  }
};
const detail =
  (mine = false) =>
  async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id))
      return res.status(404).json({ message: "Offer not found." });
    try {
      const offer = await Offer.findOne({
        _id: req.params.id,
        ...(mine ? { organizer: req.user.userId } : publicFilter()),
      }).populate("organizer", populate);
      if (!offer) return res.status(404).json({ message: "Offer not found." });
      res.json({ offer: serialize(offer) });
    } catch {
      res.status(500).json({ message: "Failed to load offer." });
    }
  };
const save =
  (edit = false) =>
  async (req, res) => {
    if (edit && !mongoose.isObjectIdOrHexString(req.params.id))
      return res.status(404).json({ message: "Offer not found." });
    let data;
    try {
      data = validate(req.body);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    try {
      const offer = edit
        ? await Offer.findOneAndUpdate(
            {
              _id: req.params.id,
              organizer: req.user.userId,
              status: { $ne: "Rejected" },
            },
            { ...data, status: "Pending" },
            { new: true, runValidators: true },
          )
        : await Offer.create({
            ...data,
            organizer: req.user.userId,
            status: "Pending",
          });
      if (!offer) return res.status(404).json({ message: "Offer not found." });
      res.status(edit ? 200 : 201).json({
        offer: serialize(offer),
        message: "Offer submitted for review.",
      });
    } catch {
      res.status(500).json({ message: "Failed to save offer." });
    }
  };
const remove = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id))
    return res.status(404).json({ message: "Offer not found." });
  try {
    const offer = await Offer.findOneAndDelete({
      _id: req.params.id,
      organizer: req.user.userId,
    });
    if (!offer) return res.status(404).json({ message: "Offer not found." });
    res.json({ message: "Offer deleted." });
  } catch {
    res.status(500).json({ message: "Failed to delete offer." });
  }
};
const moderate = async (req, res) => {
  const rejectionReason =
    typeof req.body.rejectionReason === "string"
      ? req.body.rejectionReason.trim()
      : "";
  if (req.body.status === "Rejected" && !rejectionReason)
    return res.status(400).json({ message: "A rejection reason is required." });
  if (!mongoose.isObjectIdOrHexString(req.params.id))
    return res.status(404).json({ message: "Offer not found." });
  if (!["Pending", "Approved", "Rejected"].includes(req.body.status))
    return res.status(400).json({ message: "Invalid status." });
  try {
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: "Rejected" } },
      {
        status: req.body.status,
        rejectionReason:
          req.body.status === "Rejected" ? rejectionReason : null,
      },
      { new: true, runValidators: true },
    ).populate("organizer", populate);
    if (!offer) return res.status(404).json({ message: "Offer not found." });
    res.json({ offer: serialize(offer) });
  } catch {
    res.status(500).json({ message: "Failed to update status." });
  }
};
module.exports = {
  list,
  detail,
  save,
  remove,
  moderate,
  validate,
  serialize,
  publicFilter,
};
