import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent
BLOCKCHAIN_DIR = ROOT_DIR / "blockchain"
BACKEND_ENV_PATH = BACKEND_DIR / ".env"
BACKEND_ABI_PATH = BACKEND_DIR / "app" / "contract_abi.json"
BLOCKCHAIN_ABI_PATH = BLOCKCHAIN_DIR / "contract_abi.json"
DEPLOY_SCRIPT_PATH = BLOCKCHAIN_DIR / "scripts" / "deploy.js"

ADDRESS_PATTERN = re.compile(r"EvidenceCustody deployed to:\s*(0x[a-fA-F0-9]{40})")


def update_env_file(env_path: Path, updates: dict[str, str]) -> None:
    existing_lines = []
    if env_path.exists():
        existing_lines = env_path.read_text(encoding="utf-8").splitlines()

    seen_keys: set[str] = set()
    new_lines = []
    for line in existing_lines:
        key = line.split("=", 1)[0].strip() if "=" in line else None
        if key in updates:
            new_lines.append(f"{key}={updates[key]}")
            seen_keys.add(key)
        else:
            new_lines.append(line)

    for key, value in updates.items():
        if key not in seen_keys:
            new_lines.append(f"{key}={value}")

    env_path.write_text("\n".join(new_lines).rstrip() + "\n", encoding="utf-8")


def ensure_connection(provider_url: str) -> Web3:
    web3 = Web3(Web3.HTTPProvider(provider_url))
    if not web3.is_connected():
        raise RuntimeError(f"Unable to connect to Ganache at {provider_url}. Ensure Ganache is running.")
    return web3


def is_contract_deployed(web3: Web3, address: str) -> bool:
    try:
        checksum_address = Web3.to_checksum_address(address)
        code = web3.eth.get_code(checksum_address)
        return bool(code and code not in {b"", b"\x00"})
    except Exception:
        return False


def deploy_contract() -> str:
    if not DEPLOY_SCRIPT_PATH.exists():
        raise RuntimeError(f"Deploy script not found: {DEPLOY_SCRIPT_PATH}")

    completed = subprocess.run(
        ["node", str(DEPLOY_SCRIPT_PATH)],
        cwd=str(BLOCKCHAIN_DIR),
        capture_output=True,
        text=True,
        check=False,
    )

    if completed.returncode != 0:
        raise RuntimeError(
            "Contract deployment failed.\n"
            f"stdout:\n{completed.stdout}\n"
            f"stderr:\n{completed.stderr}"
        )

    output = f"{completed.stdout}\n{completed.stderr}"
    match = ADDRESS_PATTERN.search(output)
    if not match:
        raise RuntimeError(f"Unable to parse deployed contract address from deploy output:\n{output}")

    return match.group(1)


def main() -> None:
    load_dotenv(dotenv_path=BACKEND_ENV_PATH)

    provider_url = os.getenv("BLOCKCHAIN_PROVIDER", "http://127.0.0.1:7545")
    configured_address = os.getenv("CONTRACT_ADDRESS", "").strip()

    web3 = ensure_connection(provider_url)

    if configured_address and is_contract_deployed(web3, configured_address):
        deployed_address = Web3.to_checksum_address(configured_address)
        print(f"Using existing deployed contract: {deployed_address}")
    else:
        deployed_address = Web3.to_checksum_address(deploy_contract())
        print(f"Deployed new contract: {deployed_address}")

    if not BLOCKCHAIN_ABI_PATH.exists():
        raise RuntimeError(f"Expected ABI at {BLOCKCHAIN_ABI_PATH} was not generated.")
    BACKEND_ABI_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(BLOCKCHAIN_ABI_PATH, BACKEND_ABI_PATH)
    print(f"ABI synced to: {BACKEND_ABI_PATH}")

    update_env_file(
        BACKEND_ENV_PATH,
        {
            "BLOCKCHAIN_PROVIDER": provider_url,
            "CONTRACT_ADDRESS": deployed_address,
        },
    )
    print(f"Updated backend env: {BACKEND_ENV_PATH}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[init_blockchain] ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
