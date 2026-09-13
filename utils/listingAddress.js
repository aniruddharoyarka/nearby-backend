const divisions = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Rangpur",
  "Khulna",
  "Barishal",
  "Mymensingh",
];
function cleanAddress(value) {
  if (value === undefined) return undefined;
  const address = {};
  for (const key of ["venue", "area", "division"]) {
    if (typeof value?.[key] !== "string" || !value[key].trim())
      throw new Error(
        { venue: "Venue name", area: "Area / road", division: "Division" }[
          key
        ] + " is required.",
      );
    address[key] = value[key].trim();
  }
  if (!divisions.includes(address.division))
    throw new Error("Select a valid division.");
  address.country = "Bangladesh";
  return address;
}
const formatAddress = (a) =>
  [a.venue, a.area, a.division, a.country].join(", ");
module.exports = { cleanAddress, formatAddress };
