import json
import os
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

BACKEND_DIR = Path(__file__).resolve().parents[2]
APP_DIR = BACKEND_DIR / "app"
ENV_PATH = BACKEND_DIR / ".env"
ABI_PATH = APP_DIR / "contract_abi.json"

load_dotenv(dotenv_path=ENV_PATH)

BLOCKCHAIN_PROVIDER = os.getenv("BLOCKCHAIN_PROVIDER", "http://127.0.0.1:7545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

_w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_PROVIDER))
_contract = None


def _normalize_hash(hash_hex: str) -> bytes:
    clean_hash = hash_hex.strip().lower()
    if clean_hash.startswith("0x"):
        clean_hash = clean_hash[2:]

    if len(clean_hash) != 64:
        raise ValueError("hash must be a 32-byte hex string")

    try:
        return bytes.fromhex(clean_hash)
    except ValueError as exc:
        raise ValueError("invalid hash hex value") from exc


def _get_contract():
    global _contract
    if _contract is not None:
        return _contract

    if not _w3.is_connected():
        raise RuntimeError(f"Unable to connect to blockchain provider: {BLOCKCHAIN_PROVIDER}")

    if not CONTRACT_ADDRESS:
        raise RuntimeError("CONTRACT_ADDRESS is not configured")

    if not ABI_PATH.exists():
        raise RuntimeError(f"Contract ABI file not found at {ABI_PATH}")

    with ABI_PATH.open("r", encoding="utf-8") as abi_file:
        abi = json.load(abi_file)

    _contract = _w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=abi)
    return _contract


def ensure_blockchain_ready() -> None:
    if not _w3.is_connected():
        raise RuntimeError(f"Unable to connect to blockchain provider: {BLOCKCHAIN_PROVIDER}")

    if not CONTRACT_ADDRESS:
        raise RuntimeError("CONTRACT_ADDRESS is not configured. Run backend/scripts/init_blockchain.py first.")

    if not ABI_PATH.exists():
        raise RuntimeError(f"Contract ABI file not found at {ABI_PATH}")

    checksum_address = Web3.to_checksum_address(CONTRACT_ADDRESS)
    code = _w3.eth.get_code(checksum_address)
    if not code or code in {b"", b"\x00"}:
        raise RuntimeError(f"No deployed contract found at configured address: {checksum_address}")

    # Instantiate once to validate ABI/address compatibility.
    _get_contract()


def register_on_chain(hash_hex: str) -> str:
    hash_bytes = _normalize_hash(hash_hex)
    contract = _get_contract()
    accounts = _w3.eth.accounts
    if not accounts:
        raise RuntimeError("No unlocked blockchain accounts available")

    tx_hash = contract.functions.registerEvidence(hash_bytes).transact({"from": accounts[0]})
    receipt = _w3.eth.wait_for_transaction_receipt(tx_hash)
    return receipt.transactionHash.hex()


def verify_on_chain(hash_hex: str) -> bool:
    hash_bytes = _normalize_hash(hash_hex)
    contract = _get_contract()
    return bool(contract.functions.verifyEvidence(hash_bytes).call())
