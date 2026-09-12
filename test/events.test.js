const { test } = require("node:test");
const assert = require("node:assert/strict");
const Event = require("../models/Event");
const { getEvents, getEvent, getMyEvents, updateEventStatus } = require("../controllers/eventController");

test("organizer events are scoped to the authenticated owner, ignoring supplied owner IDs", async (t) => {
  const filters = [];
  t.mock.method(Event, "find", (filter) => {
    filters.push(filter);
    return { sort: async () => [] };
  });
  for (const owner of ["organizer-one", "organizer-two"]) {
    const res = response();
    await getMyEvents({ user: { userId: owner }, query: { organizer: "other-owner" } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.events, []);
  }
  assert.deepEqual(filters, [{ organizer: "organizer-one" }, { organizer: "organizer-two" }]);
});

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const id = "507f1f77bcf86cd799439011";
const event = { _id: id, title: "Real event", tickets: [], status: "Approved", organizer: { _id: id, name: "Owner", organizationName: "Club" } };

test("creating an event requires a complete uploaded banner", async () => {
  const { createEvent } = require("../controllers/eventController");
  for (const bannerImage of [undefined, {}, { url: " " }, { url: "https://example.com/banner.jpg" }]) {
    const res = response();
    await createEvent({ body: { bannerImage } }, res);
    assert.equal(res.code, 400);
    assert.match(res.body.message, /banner/i);
  }
  const doc = new Event({ title: "Event", category: "Music", date: "2026-10-17", time: "19:00", location: "Dhaka", organizer: id, tickets: [{ name: "General", price: 0 }] });
  assert.ok(doc.validateSync().errors["bannerImage.url"]);
  doc.bannerImage = { url: "https://example.com/banner.jpg", publicId: "events/banner" };
  assert.equal(doc.validateSync(), undefined);
});

test("public listing always filters Approved; admin listing includes all statuses", async (t) => {
  const filters = [];
  t.mock.method(Event, "find", (filter) => {
    filters.push(filter);
    return { populate: () => ({ sort: async () => [event] }) };
  });
  const res = response();
  await getEvents()({}, res);
  assert.deepEqual(filters[0], { status: "Approved" });
  assert.equal(res.body.events[0].organizer.name, "Club");
  await getEvents(true)({}, response());
  assert.deepEqual(filters[1], {});
});

test("public detail query excludes pending and rejected events", async (t) => {
  t.mock.method(Event, "findOne", (filter) => {
    assert.deepEqual(filter, { _id: id, status: "Approved" });
    return { populate: async () => null };
  });
  const res = response();
  await getEvent({ params: { id } }, res);
  assert.equal(res.code, 404);
});

test("moderation persists status and returns saved event", async (t) => {
  t.mock.method(Event, "findByIdAndUpdate", (actualId, update, options) => {
    assert.equal(actualId, id);
    assert.deepEqual(update, { status: "Approved" });
    assert.equal(options.runValidators, true);
    return { populate: async () => event };
  });
  const res = response();
  await updateEventStatus({ params: { id }, body: { status: "Approved" } }, res);
  assert.equal(res.body.event.status, "Approved");
});

test("invalid status and malformed IDs are rejected", async () => {
  let res = response();
  await updateEventStatus({ params: { id }, body: { status: "Published" } }, res);
  assert.equal(res.code, 400);
  res = response();
  await updateEventStatus({ params: { id: "invalid" }, body: { status: "Approved" } }, res);
  assert.equal(res.code, 404);
  res = response();
  await getEvent({ params: { id: "invalid" } }, res);
  assert.equal(res.code, 404);
});
