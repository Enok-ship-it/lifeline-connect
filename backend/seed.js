// seed.js
// Run with: npm run seed
// Fills your database with realistic sample data so your demo/presentation
// never opens to an empty, awkward-looking app.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
const Request = require("./models/Request");
const Event = require("./models/Event");
const Donation = require("./models/Donation");

async function seed() {
  await connectDB();

  console.log("Clearing old data...");
  await Promise.all([
    User.deleteMany({}),
    Request.deleteMany({}),
    Event.deleteMany({}),
    Donation.deleteMany({}),
  ]);

  console.log("Creating users...");
  const password = await bcrypt.hash("password123", 10);

  const admin = await User.create({
    name: "Admin",
    email: "admin@lifeline.com",
    passwordHash: password,
    role: "admin",
    phone: "9999999999",
    city: "Pune",
  });

  const donors = await User.insertMany([
    { name: "Rohan Sharma", email: "rohan@example.com", passwordHash: password, role: "donor", bloodGroup: "O+", phone: "9000000001", city: "Pune", area: "Kothrud", lat: 18.5074, lng: 73.8077, points: 40, verified: true },
    { name: "Priya Nair", email: "priya@example.com", passwordHash: password, role: "donor", bloodGroup: "A+", phone: "9000000002", city: "Pune", area: "Baner", lat: 18.5590, lng: 73.7868, points: 30, verified: true },
    { name: "Aman Verma", email: "aman@example.com", passwordHash: password, role: "donor", bloodGroup: "B+", phone: "9000000003", city: "Pune", area: "Hadapsar", lat: 18.5089, lng: 73.9260, points: 20 },
    { name: "Sneha Iyer", email: "sneha@example.com", passwordHash: password, role: "donor", bloodGroup: "O-", phone: "9000000004", city: "Pune", area: "Viman Nagar", lat: 18.5679, lng: 73.9143, points: 50, verified: true },
    { name: "Karan Mehta", email: "karan@example.com", passwordHash: password, role: "donor", bloodGroup: "AB+", phone: "9000000005", city: "Mumbai", area: "Andheri", lat: 19.1197, lng: 72.8468, points: 10 },
  ]);

  const requester = await User.create({
    name: "City Care Hospital Desk",
    email: "requester@example.com",
    passwordHash: password,
    role: "requester",
    phone: "9000000099",
    city: "Pune",
  });

  console.log("Creating requests...");
  const [openRequest1, openRequest2, fulfilledRequest] = await Request.insertMany([
    { requester: requester._id, patientName: "Mr. Deshpande", bloodGroup: "O+", unitsNeeded: 2, hospitalName: "City Care Hospital", city: "Pune", area: "Kothrud", lat: 18.5089, lng: 73.8080, urgency: "high", status: "open" },
    { requester: requester._id, patientName: "Baby Anaya", bloodGroup: "A+", unitsNeeded: 1, hospitalName: "Sunshine Children's Hospital", city: "Pune", area: "Baner", lat: 18.5600, lng: 73.7870, urgency: "high", status: "open" },
    { requester: requester._id, patientName: "Mrs. Kulkarni", bloodGroup: "O+", unitsNeeded: 1, hospitalName: "City Care Hospital", city: "Pune", area: "Kothrud", lat: 18.5089, lng: 73.8080, urgency: "medium", status: "fulfilled" },
  ]);

  console.log("Creating donations (a pledge + a completed one, so the demo has real data)...");
  await Donation.insertMany([
    // Sneha has pledged but not yet been confirmed - shows up under "View pledges"
    { donor: donors[3]._id, request: openRequest1._id, status: "pledged" },
    // Rohan's completed donation - this is what makes his certificate downloadable in the demo
    {
      donor: donors[0]._id,
      request: fulfilledRequest._id,
      status: "completed",
      dateDonated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("Creating events...");
  await Event.insertMany([
    { title: "Community Blood Donation Camp", date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), location: "FC Road, Pune", organizerName: "Lions Club Pune", description: "Open to all healthy donors aged 18-65." },
    { title: "College Blood Drive", date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), location: "BCA Dept Auditorium", organizerName: "NSS Unit", description: "Organized with the local Red Cross chapter." },
  ]);

  console.log("Done! Sample logins (all use password: password123):");
  console.log("  Donor:     rohan@example.com  (has a completed donation - try downloading its certificate)");
  console.log("  Requester: requester@example.com  (has an open request with a pending pledge to manage)");
  console.log("  Admin:     admin@lifeline.com");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
