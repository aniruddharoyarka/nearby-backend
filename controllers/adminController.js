const User = require("../models/User");

// Only the fields the admin panel currently displays for a regular
// user (UsersTable / UserDetailsModal). There's deliberately no
// "events" count here — there's no Event/attendance model yet to
// compute a real number from, and showing a hardcoded 0 for every
// user would be misleading placeholder data.
const serializeAdminUser = (user) => ({
    profilePicture: { url: user.profilePicture?.url || null },
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || "Not provided",
    joined: user.createdAt,
    status: user.status,
});

// Same idea for the Organizers table/modal — no events/offers counts
// until there's a real Event/Offer collection to derive them from.
const serializeAdminOrganizer = (organizer) => ({
    profilePicture: { url: organizer.profilePicture?.url || null },
    id: organizer._id,
    name: organizer.organizationName || organizer.name,
    owner: organizer.name,
    email: organizer.email,
    phone: organizer.phone || "Not provided",
    status: organizer.status,
});

//GET /api/admin/users — real registered users, most recent first
const getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "user" })
            .select(["-password", "-__v"])
            .sort({ createdAt: -1 });

        return res.status(200).json({
            users: users.map(serializeAdminUser),
        });
    } catch (error) {
        console.error("Get admin users error:", error);

        return res.status(500).json({
            message: "Something went wrong while fetching users.",
        });
    }
};

//GET /api/admin/organizers — real registered organizers, most recent first
const getOrganizers = async (req, res) => {
    try {
        const organizers = await User.find({ role: "organizer" })
            .select(["-password", "-__v"])
            .sort({ createdAt: -1 });

        return res.status(200).json({
            organizers: organizers.map(serializeAdminOrganizer),
        });
    } catch (error) {
        console.error("Get admin organizers error:", error);

        return res.status(500).json({
            message: "Something went wrong while fetching organizers.",
        });
    }
};

//GET /api/admin/stats — real counts for the dashboard's stat cards
const getStats = async (req, res) => {
    try {
        const [totalUsers, totalOrganizers] = await Promise.all([
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: "organizer" }),
        ]);

        return res.status(200).json({
            totalUsers,
            totalOrganizers,
        });
    } catch (error) {
        console.error("Get admin stats error:", error);

        return res.status(500).json({
            message: "Something went wrong while fetching stats.",
        });
    }
};

//PATCH /api/admin/users/:id/status — toggle Active / Suspended
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["Active", "Suspended"].includes(status)) {
            return res.status(400).json({
                message: "Status must be 'Active' or 'Suspended'.",
            });
        }

        //scoped to role: "user" so this endpoint can never be repurposed
        //to touch an organizer or admin account
        const user = await User.findOneAndUpdate(
            { _id: id, role: "user" },
            { status },
            { new: true }
        ).select(["-password", "-__v"]);

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        return res.status(200).json({
            message: "User status updated.",
            user: serializeAdminUser(user),
        });
    } catch (error) {
        console.error("Update user status error:", error);

        return res.status(500).json({
            message: "Something went wrong while updating the user.",
        });
    }
};

//PATCH /api/admin/organizers/:id/status — Approve / Suspend / mark Pending
const updateOrganizerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["Approved", "Pending", "Suspended"].includes(status)) {
            return res.status(400).json({
                message:
                    "Status must be 'Approved', 'Pending', or 'Suspended'.",
            });
        }

        const organizer = await User.findOneAndUpdate(
            { _id: id, role: "organizer" },
            { status },
            { new: true }
        ).select(["-password", "-__v"]);

        if (!organizer) {
            return res.status(404).json({
                message: "Organizer not found.",
            });
        }

        return res.status(200).json({
            message: "Organizer status updated.",
            organizer: serializeAdminOrganizer(organizer),
        });
    } catch (error) {
        console.error("Update organizer status error:", error);

        return res.status(500).json({
            message: "Something went wrong while updating the organizer.",
        });
    }
};

module.exports = {
    getUsers,
    getOrganizers,
    getStats,
    updateUserStatus,
    updateOrganizerStatus,
};
