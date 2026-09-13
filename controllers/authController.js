const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const deleteFiles = require("../utils/deleteFiles");

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days, matches JWT expiresIn

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  username: user.username,
  organizationName: user.organizationName,
  phone: user.phone,
  about: user.about,
  website: user.website,
  address: user.address,
  area: user.area,
  city: user.city,
  division: user.division,
  facebook: user.facebook,
  instagram: user.instagram,
  establishedYear: user.establishedYear,
  profilePicture: user.profilePicture,
  createdAt: user.createdAt,
});

//register organizer
const register = async (req, res) => {
  try {
    const { name, email, password, role, organizationName, phone } = req.body;

    //validate fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    //clean input areas
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanName) {
      return res.status(400).json({
        message: "Name cannot be empty.",
      });
    }

    //validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    //validate password
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    //check existing email
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    //determine user role
    const userRole = role === "organizer" ? "organizer" : "user";

    //organizer validation
    let cleanOrganizationName = null;
    let cleanPhone = null;

    if (userRole === "organizer") {
      cleanOrganizationName = organizationName?.trim() || null;

      cleanPhone = phone?.trim() || null;

      if (!cleanOrganizationName) {
        return res.status(400).json({
          message: "Organization or business name is required for organizers.",
        });
      }

      if (!cleanPhone) {
        return res.status(400).json({
          message: "Phone number is required for organizers.",
        });
      }
    }

    //hashing password using bycrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    //create user
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,

      role: userRole,

      organizationName: userRole === "organizer" ? cleanOrganizationName : null,

      phone: userRole === "organizer" ? cleanPhone : null,
    });

    //response
    return res.status(201).json({
      message: "Registration successful.",

      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Something went wrong while registering.",
    });
  }
};

//login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    //validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    //clean email
    const cleanEmail = email.toLowerCase().trim();

    //find user
    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    //compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.status === "Suspended") {
      return res.status(403).json({
        message:
          "This account has been suspended. Contact support if you think this is a mistake.",
      });
    }

    if (role && user.role !== role) {
      if (role === "admin") {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      if (role === "organizer") {
        return res.status(403).json({
          message: "This account is not registered as an organizer.",
        });
      }

      return res.status(403).json({
        message:
          user.role === "organizer"
            ? "Please use the organizer login option for this account."
            : "This account can't sign in from here.",
      });
    }

    //create jwt
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    //set jwt as httpOnly cookie instead of sending it in the response body
    res.cookie("token", token, {
      ...cookieOptions,
      maxAge: TOKEN_MAX_AGE,
    });

    //response
    return res.status(200).json({
      message: "Login successful.",

      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong while logging in.",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    //find user jwt using userid
    const user = await User.findById(req.user.userId).select("-password");

    //user not found
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    //response
    return res.status(200).json({
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Something went wrong while getting profile.",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const {
      name,
      username,
      phone,
      organizationName,
      about,
      website,
      address,
      area,
      city,
      division,
      facebook,
      instagram,
      establishedYear,
    } = req.body;

    //name
    if (name !== undefined) {
      const cleanName = name.trim();

      if (!cleanName) {
        return res.status(400).json({
          message: "Name cannot be empty.",
        });
      }

      user.name = cleanName;
    }

    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase();

      if (!cleanUsername) {
        user.username = null;
      } else if (cleanUsername !== user.username) {
        const existingUsername = await User.findOne({
          username: cleanUsername,
        });

        if (existingUsername) {
          return res.status(409).json({
            message: "This username is already taken.",
          });
        }

        user.username = cleanUsername;
      }
    }

    //remaining plain text fields — free-form, no uniqueness needed
    const textFields = {
      phone,
      organizationName,
      about,
      website,
      address,
      area,
      city,
      division,
      facebook,
      instagram,
      establishedYear,
    };

    for (const [field, value] of Object.entries(textFields)) {
      if (value !== undefined) {
        user[field] = typeof value === "string" ? value.trim() || null : value;
      }
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Something went wrong while updating your profile.",
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "An image file is required.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const previousPublicId = user.profilePicture?.publicId;

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "nearby/profile-pictures",
    });

    user.profilePicture = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    await user.save();

    if (previousPublicId) {
      cloudinary.uploader
        .destroy(previousPublicId)
        .catch((error) =>
          console.error(
            "Failed to delete previous profile picture from Cloudinary:",
            error
          )
        );
    }

    return res.status(200).json({
      message: "Profile picture updated.",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);

    return res.status(500).json({
      message: "Something went wrong while uploading your photo.",
    });
  } finally {
    if (req.file) {
      deleteFiles([req.file.path]);
    }
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const publicId = user.profilePicture?.publicId;

    user.profilePicture = { url: null, publicId: null };

    await user.save();

    if (publicId) {
      cloudinary.uploader
        .destroy(publicId)
        .catch((error) =>
          console.error(
            "Failed to delete profile picture from Cloudinary:",
            error
          )
        );
    }

    return res.status(200).json({
      message: "Profile picture removed.",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Delete profile picture error:", error);

    return res.status(500).json({
      message: "Something went wrong while removing your photo.",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);

    if (isSameAsCurrent) {
      return res.status(400).json({
        message: "New password must be different from the current password.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    await user.save();

    return res.status(200).json({
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "Something went wrong while updating your password.",
    });
  }
};

//logout
const logout = (req, res) => {
  res.clearCookie("token", cookieOptions);

  return res.status(200).json({
    message: "Logout successful.",
  });
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  uploadProfilePicture,
  deleteProfilePicture,
  changePassword,
  logout,
  serializeUser,
};
