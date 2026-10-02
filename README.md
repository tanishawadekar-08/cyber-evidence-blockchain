# Cyber Evidence Chain

A blockchain-based digital forensic evidence management system. It records the digital fingerprint (SHA-256 hash) of every evidence file on a blockchain, keeps a complete chain of custody, and lets only an authorised officer, verified by face recognition, update evidence status or record a court decision.

---

## Overview

Digital evidence can be copied, edited or replaced without leaving an obvious trace. **Cyber Evidence Chain** solves this by writing the hash and details of each evidence file to a Solidity smart contract on an Ethereum blockchain. Once recorded, the entry cannot be quietly changed, so any later modification of the file is detected when its hash no longer matches. The file itself is not stored on the blockchain, only its hash.

---

## Features

- **Case management**: create a case, then upload evidence under it
- **Evidence upload with SHA-256 hashing**: the file's hash, name, description, uploader address and timestamp are stored on-chain; every item gets a unique Evidence ID and duplicate files are rejected
- **Tamper-proof verification**: upload any file to check it against the blockchain; a changed file shows no match
- **Chain of custody**: every action on an evidence item is logged with who did it and when
- **Status lifecycle**: Registered, Under Review, Court Certified, Archived
- **Court certification**: record the court level, outcome, certifying address and time on-chain
- **Face-recognition officer access**: status updates and court certification are allowed only after the officer unlocks with their face, and the server enforces this
- **QR code for each evidence item**: contains the evidence ID, case ID, file name and hash
- **PDF forensic report**: download a report for a case with all its evidence and custody logs
- **Case-wise evidence view**: filter evidence by case

---

## Tech Stack

| Category | Technology |
|---|---|
| Smart Contract | Solidity 0.5.16 |
| Blockchain Framework | Truffle |
| Local Blockchain | Ganache |
| Server | Node.js, Express |
| Blockchain Connection | Web3.js |
| File Upload / Reports / QR | Multer, PDFKit, QRCode |
| Face Recognition | face-api.js |
| Front End | HTML, CSS, JavaScript |
| IDE | VS Code |

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Truffle](https://trufflesuite.com/): `npm install -g truffle`
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI), running on port 7545
- Google Chrome (or any modern browser) with a webcam, for face unlock
- Internet connection on first use (the face recognition models load from a CDN)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Ganache** and keep it running. The default RPC URL is `HTTP://127.0.0.1:7545`.

4. **Deploy the smart contract**
   ```bash
   truffle migrate --reset
   ```
   Run this on your own machine. The contract address saved in `build/contracts/Evidence.json` belongs to the original developer's Ganache and will not exist on yours. Run it again every time Ganache is restarted or reset.

5. **Enroll the officer face (first time only).** Choose any secret admin key and start the server with it.

   Command Prompt:
   ```
   set ADMIN_KEY=your-secret-key
   node server.js
   ```
   PowerShell:
   ```
   $env:ADMIN_KEY="your-secret-key"; node server.js
   ```
   Open `http://localhost:3000`, type the admin key in the **First-time setup** box, click **Enroll officer face**, and allow the camera. The face is saved in `officer-face.json`.

6. **Run the server normally from then on**
   ```bash
   node server.js
   ```
   You should see `Connected to contract at: 0x...`. Open `http://localhost:3000`.

---

## How to Use

1. **Create a case**: enter a case title, for example `FIR-2026-Demo`, and click **Create Case**
2. **Upload evidence**: choose the case, select a file, add a description, and upload; the hash is written to the blockchain
3. **Verify a file**: upload any file in **Verify a file**; the system recomputes its hash and checks it against the chain
4. **Unlock officer access**: click **Unlock with face**; the panel stays unlocked for 30 minutes
5. **Update status or certify**: on any evidence block, choose a status and click **Update status**, or enter the court and outcome and click **Certify by court**
6. **View the custody log**: open **Custody log** on a block to see every action, with time and address
7. **Download the report**: click **Download case PDF report** for a case summary with all evidence and logs

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Parameter decoding error` or `No contract found at 0x...` | The saved contract address is stale. Start Ganache, run `truffle migrate --reset`, then restart `node server.js` |
| `truffle cannot be loaded because running scripts is disabled` (PowerShell) | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, or use `truffle.cmd migrate --reset` |
| `$env:... syntax is incorrect` | You are in Command Prompt. Use `set ADMIN_KEY=your-secret-key` instead |
| `Cannot reach Ganache` | Open Ganache first and make sure it runs on port 7545 |
| No First-time setup box | `officer-face.json` already exists. Delete it and restart the server with an admin key |
| Face not detected | Use better lighting, face the camera directly, and allow camera permission |

---

## Screenshots

### Uploading Evidence
![Uploading Evidence](screenshots/ScreenShot_1%20%28Uploading%20Evidence%29.png)

### Verifying Evidence
![Verifying Evidence](screenshots/ScreenShot_2%20%28Verifying%20Evidence%29.png)

### Chain of Evidence
![Chain Of Evidence](screenshots/ScreenShot_3%20%28Chain%20Of%20Evidence%29.png)

---

## Privacy Note

`officer-face.json` (face data) and the `uploads/` folder (evidence files) are listed in `.gitignore` and must never be pushed to GitHub.

---

## Future Improvements

- [ ] User registration and login with role-based access (Admin, Investigator, Examiner, Viewer)
- [ ] Password-protected access to evidence files
- [ ] Digital signatures for evidence submission
- [ ] IP address and collection location recording
- [ ] Access history and download history for each evidence item
- [ ] Advanced search by Case ID, Evidence ID, date and evidence type
- [ ] Secure evidence sharing with authorised users
- [ ] Blockchain transaction viewer (transaction hash, block number, timestamp)
- [ ] Liveness detection for face unlock
- [ ] IPFS integration for decentralized file storage
- [ ] Deployment on a public testnet (e.g., Sepolia)

---

## License

This project is licensed under the MIT License.

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/<your-username>/<your-repo-name>/issues).