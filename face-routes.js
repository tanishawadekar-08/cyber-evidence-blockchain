// face-routes.js
// In server.js, after app.use(express.json()):
//   const faceRoutes = require("./face-routes");
//   faceRoutes(app);
//   app.post("/officiallyVerify", faceRoutes.requireOfficer, ...your existing handler...);
// Start the server with:  ADMIN_KEY=your-secret node server.js

const fs = require("fs");
const crypto = require("crypto");

const FILE = "./officer-face.json";          // enrolled descriptor lives here, not in the browser
const ADMIN_KEY = process.env.ADMIN_KEY;     // required to enroll
const MAX_DISTANCE = 0.5;                    // same threshold the old front end used
const SESSION_MS = 30 * 60 * 1000;           // officer session lasts 30 minutes
const tokens = new Map();                    // token -> expiry time

const stored = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : null);
const validDescriptor = d => Array.isArray(d) && d.length === 128 && d.every(Number.isFinite);
const distance = (a, b) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));

function requireOfficer(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const expires = tokens.get(token);
  if (!expires || expires < Date.now()) {
    tokens.delete(token);
    return res.status(401).json({ success: false, error: "Officer login required" });
  }
  next();
}

module.exports = function (app) {
  // Tells the page whether to show the first-time setup card
  app.get("/officerFace", (req, res) => res.json({ enrolled: !!stored() }));

  // One-time enrollment: needs the admin key and refuses if someone is already enrolled
  app.post("/enrollFace", (req, res) => {
    if (!ADMIN_KEY || req.headers["x-admin-key"] !== ADMIN_KEY)
      return res.status(403).json({ success: false, error: "Wrong admin key" });
    if (stored())
      return res.status(409).json({ success: false, error: "An officer is already enrolled" });
    if (!validDescriptor(req.body.descriptor))
      return res.status(400).json({ success: false, error: "Invalid face data" });
    fs.writeFileSync(FILE, JSON.stringify(req.body.descriptor));
    res.json({ success: true });
  });

  // Login: the server compares faces and hands back a session token
  app.post("/officerFace", (req, res) => {
    const enrolled = stored();
    if (!enrolled) return res.json({ success: false, error: "No officer is enrolled yet" });
    const d = req.body.descriptor;
    if (!validDescriptor(d) || distance(enrolled, d) >= MAX_DISTANCE)
      return res.json({ success: false, error: "Face mismatch. Access denied." });
    const token = crypto.randomBytes(24).toString("hex");
    tokens.set(token, Date.now() + SESSION_MS);
    res.json({ success: true, token });
  });
};

module.exports.requireOfficer = requireOfficer;