## Blockchain (`blockchain/`)

Solidity smart contract and deployment tooling for evidence hash registration on **Ganache**.

### Contract: `EvidenceCustody.sol`

| Function | Purpose |
|----------|---------|
| `registerEvidence(bytes32 hash)` | Store hash on-chain (one-time per hash) |
| `verifyEvidence(bytes32 hash)` | Returns `true` if hash was registered |

The backend converts SHA-256 hex strings to `bytes32` and calls these methods via Web3.py.

### Local setup

1. Start **Ganache** with RPC `http://127.0.0.1:7545`.
2. Install Node dependencies:

   ```bash
   cd blockchain
   npm install
   ```

3. Deploy (or use backend helper):

   ```bash
   node scripts/deploy.js
   ```

   Or from `backend/`:

   ```bash
   python scripts/init_blockchain.py
   ```

   This writes `contract_abi.json`, copies ABI to `backend/app/contract_abi.json`, and sets `CONTRACT_ADDRESS` in `backend/.env`.

### Files

| Path | Role |
|------|------|
| `contracts/EvidenceCustody.sol` | Smart contract source |
| `scripts/deploy.js` | Compile (solc) + deploy (ethers v6) |
| `contract_abi.json` | ABI consumed by backend |

### Security note

Use Ganache **test accounts only**. Never commit private keys or production mnemonics.
