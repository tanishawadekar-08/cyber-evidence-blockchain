const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {Web3} = require("web3");

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

// File storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage: storage });

app.use(express.static("public")); // serves our frontend HTML
app.use(express.json());

// Initialize contract connection
async function initContract() {
  const networkId = await web3.eth.net.getId();
  const deployedNetwork = contractJSON.networks[networkId];
  if (!deployedNetwork) {
    console.error("Contract not deployed on this network. Run 'truffle migrate' first.");
    return;
  }
  contractAddress = deployedNetwork.address;
  contract = new web3.eth.Contract(contractABI, contractAddress);
  console.log("Connected to contract at:", contractAddress);
}
initContract();

// Helper: compute SHA-256 hash of a file
function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

// Route: upload evidence
app.post("/upload", upload.single("evidenceFile"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileHash = hashFile(filePath);
    const description = req.body.description || "";

    const accounts = await web3.eth.getAccounts();

    const result = await contract.methods
      .addEvidence(fileHash, req.file.originalname, description)
      .send({ from: accounts[0], gas: 300000 });

    res.json({
      success: true,
      fileHash: fileHash,
      fileName: req.file.originalname,
      txHash: result.transactionHash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Route: get all evidence records
app.get("/evidence", async (req, res) => {
  try {
    const count = await contract.methods.getEvidenceCount().call();
    const records = [];
    for (let i = 0; i < count; i++) {
      const record = await contract.methods.getEvidence(i).call();
      records.push({
        id: i,
        fileHash: record.fileHash,
        fileName: record.fileName,
        description: record.description,
        uploadedBy: record.uploadedBy,
        timestamp: Number(record.timestamp),
      });
    }
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route: verify a file against blockchain (re-upload to check tampering)
app.post("/verify", upload.single("verifyFile"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileHash = hashFile(filePath);
    const exists = await contract.methods.verifyEvidence(fileHash).call();

    res.json({
      fileHash: fileHash,
      verified: exists,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});