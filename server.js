const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Web3 } = require("web3");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = 3000;

// Connect to Ganache blockchain
const web3 = new Web3("http://127.0.0.1:7545");

// Load compiled contract (ABI + address come from here)
const contractJSON = JSON.parse(
  fs.readFileSync("./build/contracts/Evidence.json", "utf8")
);
const contractABI = contractJSON.abi;

let contractAddress;
let contract;

// File storage setup (create the uploads folder if it is missing)
fs.mkdirSync("uploads", { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage: storage });

app.use(express.static("public")); // serves our frontend HTML
app.use(express.json());
const faceRoutes = require("./face-routes");
faceRoutes(app);

// Initialize contract connection
// Also checks that real contract code exists at the saved address. If Ganache was
// restarted/reset, the address in build/contracts/Evidence.json is stale and every
// call fails with "Parameter decoding error". We detect that here and say so clearly.
let contractProblem = "Contract is still connecting, try again in a moment.";

async function initContract() {
  try {
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = contractJSON.networks[networkId];
    if (!deployedNetwork) {
      contractProblem = `Contract is not deployed on network ${networkId}. Run: truffle migrate --reset, then restart the server.`;
      console.error(contractProblem);
      return;
    }
    const code = await web3.eth.getCode(deployedNetwork.address);
    if (!code || code === "0x") {
      contractProblem = `No contract found at ${deployedNetwork.address} (Ganache was reset?). Run: truffle migrate --reset, then restart the server.`;
      console.error(contractProblem);
      return;
    }
    contractAddress = deployedNetwork.address;
    contract = new web3.eth.Contract(contractABI, contractAddress);
    contractProblem = null;
    console.log("Connected to contract at:", contractAddress);
  } catch (err) {
    contractProblem = "Cannot reach Ganache at http://127.0.0.1:7545. Start Ganache first, then restart the server.";
    console.error(contractProblem, err.message);
  }
}
initContract();

// Any blockchain route returns a clear JSON error until the contract is really connected
const chainRoutes = ["/createCase", "/cases", "/upload", "/evidence", "/verify", "/updateStatus", "/certifyCourt", "/custody", "/qr", "/report"];
app.use((req, res, next) => {
  if (!contract && chainRoutes.some(r => req.path === r || req.path.startsWith(r + "/"))) {
    return res.status(503).json({ success: false, error: contractProblem });
  }
  next();
});

// Helper: compute SHA-256 hash of a file
function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

// Status enum mapping (must match the order in Evidence.sol)
const STATUS_NAMES = ["Registered", "UnderReview", "CourtCertified", "Archived"];

function statusIndexToName(index) {
  return STATUS_NAMES[Number(index)] || "Unknown";
}

function statusNameToIndex(name) {
  const idx = STATUS_NAMES.indexOf(name);
  if (idx === -1) {
    throw new Error(`status must be one of: ${STATUS_NAMES.join(", ")}`);
  }
  return idx;
}

// Helper: fetch full custody log for one evidence id
async function fetchCustodyLog(evidenceId) {
  const count = await contract.methods.getCustodyCount(evidenceId).call();
  const log = [];
  for (let i = 0; i < Number(count); i++) {
    const ev = await contract.methods.getCustodyEvent(evidenceId, i).call();
    log.push({
      actor: ev.actor,
      action: ev.action,
      timestamp: Number(ev.timestamp),
    });
  }
  return log;
}

// ---------------- Case routes ----------------

// POST /createCase  { caseTitle }
app.post("/createCase", async (req, res) => {
  try {
    const { caseTitle } = req.body;
    if (!caseTitle) {
      return res.status(400).json({ error: "caseTitle is required" });
    }

    const accounts = await web3.eth.getAccounts();
    const result = await contract.methods
      .createCase(caseTitle)
      .send({ from: accounts[0], gas: 300000 });

    const count = await contract.methods.getCaseCount().call();
    const caseId = Number(count) - 1;

    res.json({
      success: true,
      caseId,
      txHash: result.transactionHash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /cases
app.get("/cases", async (req, res) => {
  try {
    const count = await contract.methods.getCaseCount().call();
    const cases = [];
    for (let i = 0; i < Number(count); i++) {
      const c = await contract.methods.getCase(i).call();
      cases.push({
        caseId: i,
        caseTitle: c.caseTitle,
        createdBy: c.createdBy,
        createdAt: Number(c.createdAt),
        evidenceCount: Number(c.evidenceCount),
      });
    }
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Evidence routes ----------------

// POST /upload  (multipart: file field "evidenceFile", body fields caseId, description)
app.post("/upload", upload.single("evidenceFile"), async (req, res) => {
  try {
    const { caseId, description } = req.body;
    if (caseId === undefined) {
      return res.status(400).json({ error: "caseId is required" });
    }

    const filePath = req.file.path;
    const fileHash = hashFile(filePath);

    const accounts = await web3.eth.getAccounts();

      const result = await contract.methods
      .addEvidence(caseId, fileHash, req.file.originalname, description || "")
      .send({ from: accounts[0], gas: 400000 });

    const evCount = await contract.methods.getEvidenceCount().call();
    const evidenceId = Number(evCount) - 1;

    res.json({
      success: true,
      evidenceId,
      caseId: Number(caseId),
      fileHash,
      fileName: req.file.originalname,
      txHash: result.transactionHash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /evidence  (optional ?caseId= filter)
app.get("/evidence", async (req, res) => {
  try {
    const { caseId } = req.query;
    const count = await contract.methods.getEvidenceCount().call();
    const records = [];

    for (let i = 0; i < Number(count); i++) {
      const record = await contract.methods.getEvidence(i).call();

      if (caseId !== undefined && Number(record.caseId) !== Number(caseId)) {
        continue;
      }

      const custodyLog = await fetchCustodyLog(i);

      records.push({
        id: i,
        caseId: Number(record.caseId),
        fileHash: record.fileHash,
        fileName: record.fileName,
        description: record.description,
        uploadedBy: record.uploadedBy,
        timestamp: Number(record.timestamp),
        status: statusIndexToName(record.status),
        custodyLog,
      });
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /verify  (re-upload a file to check it matches a hash on-chain)
app.post("/verify", upload.single("verifyFile"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileHash = hashFile(filePath);
    const exists = await contract.methods.verifyEvidence(fileHash).call();

    res.json({
      fileHash,
      verified: exists,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /updateStatus  { evidenceId, status, note }
app.post("/updateStatus", faceRoutes.requireOfficer, async (req, res) => {
  try {
    const { evidenceId, status, note } = req.body;
    if (evidenceId === undefined || !status) {
      return res.status(400).json({ error: "evidenceId and status are required" });
    }

    const statusIndex = statusNameToIndex(status);
    const accounts = await web3.eth.getAccounts();

    const result = await contract.methods
      .updateStatus(evidenceId, statusIndex, note || `Status changed to ${status}`)
      .send({ from: accounts[0], gas: 300000 });

    res.json({
      success: true,
      evidenceId: Number(evidenceId),
      status,
      txHash: result.transactionHash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /certifyCourt  { evidenceId, courtTier, outcome }
app.post("/certifyCourt", faceRoutes.requireOfficer, async (req, res) => {
  try {
    const { evidenceId, courtTier, outcome } = req.body;
    if (evidenceId === undefined || !courtTier || !outcome) {
      return res.status(400).json({ error: "evidenceId, courtTier and outcome are required" });
    }

    const accounts = await web3.eth.getAccounts();
    const result = await contract.methods
      .certifyByCourt(evidenceId, courtTier, outcome)
      .send({ from: accounts[0], gas: 300000 });

    res.json({
      success: true,
      evidenceId: Number(evidenceId),
      courtTier,
      outcome,
      txHash: result.transactionHash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /custody/:id
app.get("/custody/:id", async (req, res) => {
  try {
    const evidenceId = req.params.id;
    const record = await contract.methods.getEvidence(evidenceId).call();
    const custodyLog = await fetchCustodyLog(evidenceId);

    res.json({
      evidenceId: Number(evidenceId),
      caseId: Number(record.caseId),
      status: statusIndexToName(record.status),
      custodyLog,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /qr/:id  -> PNG QR code encoding evidence id + hash
app.get("/qr/:id", async (req, res) => {
  try {
    const evidenceId = req.params.id;
    const record = await contract.methods.getEvidence(evidenceId).call();

    const payload = JSON.stringify({
      evidenceId: Number(evidenceId),
      caseId: Number(record.caseId),
      fileName: record.fileName,
      fileHash: record.fileHash,
    });

    res.setHeader("Content-Type", "image/png");
    QRCode.toFileStream(res, payload, { type: "png", width: 300 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /report/:caseId  -> PDF forensic report
app.get("/report/:caseId", async (req, res) => {
  try {
    const caseId = req.params.caseId;
    const caseData = await contract.methods.getCase(caseId).call();

    const evidenceCount = await contract.methods.getEvidenceCount().call();
    const items = [];
    for (let i = 0; i < Number(evidenceCount); i++) {
      const record = await contract.methods.getEvidence(i).call();
      if (Number(record.caseId) !== Number(caseId)) continue;
      const custodyLog = await fetchCustodyLog(i);
      items.push({
        id: i,
        fileName: record.fileName,
        fileHash: record.fileHash,
        status: statusIndexToName(record.status),
        uploadedBy: record.uploadedBy,
        timestamp: Number(record.timestamp),
        custodyLog,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=report-case-${caseId}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text("Digital Forensic Evidence Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Case ID: ${caseId}`);
    doc.text(`Case Title: ${caseData.caseTitle}`);
    doc.text(`Created By: ${caseData.createdBy}`);
    doc.text(`Created At: ${new Date(Number(caseData.createdAt) * 1000).toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(14).text(`Evidence Items (${items.length})`, { underline: true });
    doc.moveDown(0.5);

    items.forEach((item, idx) => {
      doc.fontSize(12).text(`${idx + 1}. ${item.fileName}`);
      doc.fontSize(10).text(`   Evidence ID: ${item.id}`);
      doc.text(`   File Hash: ${item.fileHash}`);
      doc.text(`   Status: ${item.status}`);
      doc.text(`   Uploaded By: ${item.uploadedBy}`);
      doc.text(`   Uploaded At: ${new Date(item.timestamp * 1000).toLocaleString()}`);
      doc.text(`   Chain of Custody:`);
      item.custodyLog.forEach((log) => {
        doc.text(`     - [${new Date(log.timestamp * 1000).toLocaleString()}] ${log.actor}: ${log.action}`);
      });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});