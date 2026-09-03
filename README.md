# Cyber Evidence Blockchain

A blockchain-based system for securely storing and verifying digital cyber evidence, ensuring tamper-proof integrity from collection to court-ready presentation.

---

## Overview

**Cyber Evidence Blockchain** addresses a critical gap in digital forensics — the need for a tamper-evident chain of custody for cyber evidence. By leveraging blockchain's immutability, this system allows investigators and organizations to upload, verify, and log digital evidence in a way that guarantees authenticity and prevents unauthorized modification.

---

## Features

- **Secure Evidence Upload** — Digital evidence is hashed and recorded on the blockchain at the time of submission
- **Tamper-Proof Verification** — Instantly verify whether a piece of evidence has been altered since it was first stored
- **Immutable Log Records** — Every action (upload, verification, access) is permanently logged on-chain for a complete audit trail
- **Wallet-Based Authentication** — Uses MetaMask for secure, decentralized user identity
- **Smart Contract Driven** — Core logic enforced through Solidity smart contracts, removing reliance on a trusted central authority

---

## Tech Stack

| Category | Technology |
|---|---|
| Blockchain Framework | Truffle |
| Local Blockchain | Ganache |
| Wallet / Auth | MetaMask |
| Runtime | Node.js |
| Smart Contracts | Solidity |
| IDE | VS Code |

---

## Installation & Setup

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [Truffle](https://trufflesuite.com/) — `npm install -g truffle`
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI)
- [MetaMask](https://metamask.io/) browser extension

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/cyber-evidence-blockchain.git
   cd cyber-evidence-blockchain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Ganache**
   Launch Ganache and note the RPC server URL (default: `HTTP://127.0.0.1:7545`).

4. **Configure Truffle**
   Update `truffle-config.js` with your Ganache network settings (host, port, network ID).

5. **Compile smart contracts**
   ```bash
   truffle compile
   ```

6. **Deploy contracts to the local blockchain**
   ```bash
   truffle migrate
   ```

7. **Connect MetaMask**
   - Add a custom network pointing to your Ganache RPC URL
   - Import one of the Ganache-generated accounts using its private key

8. **Run the application**
   ```bash
   npm start
   ```

---

## How to Use

1. **Connect Wallet** — Open the app and connect your MetaMask wallet
2. **Upload Evidence** — Select a digital file (image, document, video, etc.); the system generates a cryptographic hash and stores it on the blockchain
3. **Verify Evidence** — Upload the same file at any point later to check its hash against the blockchain record and confirm it hasn't been tampered with
4. **View Logs** — Access the log records to see a complete, timestamped history of every upload and verification action

---

## Screenshots

### Uploading Evidence
![Uploading Evidence](screenshots/ScreenShot_1%20%28Uploading%20Evidence%29.png)

### Verifying Evidence
![Verifying Evidence](screenshots/ScreenShot_2%20%28Verifying%20Evidence%29.png)

### Chain of Evidence
![Chain Of Evidence](screenshots/ScreenShot_3%20%28Chain%20Of%20Evidence%29.png)

---

## Future Improvements

- [ ] IPFS integration for decentralized file storage (reduce on-chain storage costs)
- [ ] Role-based access control for investigators, admins, and auditors
- [ ] Multi-signature approval for sensitive evidence actions
- [ ] Mobile-friendly interface
- [ ] Integration with real-world forensic tools and chain-of-custody standards
- [ ] Deployment on a public testnet (e.g., Sepolia) for wider accessibility

---

## License

This project is licensed under the MIT License.

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/<your-username>/cyber-evidence-blockchain/issues).