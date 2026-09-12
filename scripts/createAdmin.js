// One-off CLI tool for creating admin accounts directly against the
// database. This is intentionally NOT an HTTP endpoint — it only runs
// if someone with shell + DB access executes it locally or on the
// server. It always creates role: "admin" — there is no way to pass a
// different role in, on purpose.
//
// Usage:
//   node scripts/createAdmin.js --name "Jane Doe" --email jane@nearby.com --password "somethingStrong123"
//
// Or run it with no flags and it will prompt you interactively:
//   node scripts/createAdmin.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const readline = require("readline");
require("dotenv").config();

const User = require("../models/User");

// ---- tiny arg parser (no extra dependency needed) ----
function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);

    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith("--")) {
            const key = argv[i].slice(2);
            const value = argv[i + 1];
            args[key] = value;
            i++;
        }
    }

    return args;
}

// ---- interactive fallback for any missing flag ----
function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    const args = parseArgs();

    const name = args.name || (await ask("Admin name: "));
    const email = (args.email || (await ask("Admin email: ")))
        .toLowerCase()
        .trim();
    const password = args.password || (await ask("Admin password: "));

    // Same validation rules as the public register endpoint, so we
    // never end up with an admin account that couldn't have logged in.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
        console.error("Name is required.");
        process.exit(1);
    }

    if (!emailRegex.test(email)) {
        console.error("Please provide a valid email address.");
        process.exit(1);
    }

    if (!password || password.length < 6) {
        console.error("Password must be at least 6 characters long.");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);

    try {
        const existing = await User.findOne({ email });

        if (existing) {
            console.error(
                `An account with ${email} already exists (role: ${existing.role}). Aborting.`
            );
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = await User.create({
            name: name.trim(),
            email,
            password: hashedPassword,
            role: "admin", // hardcoded — not derived from any input
        });

        console.log("✅ Admin account created:");
        console.log(`   Name:  ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role:  ${admin.role}`);
        console.log("\nYou can now sign in at /admin/login.");
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error("Failed to create admin:", error);
    process.exit(1);
});
