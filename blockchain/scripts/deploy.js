const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
const path = require("path");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
  const contractPath = path.resolve(__dirname, "../contracts/EvidenceCustody.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "EvidenceCustody.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors && output.errors.length > 0) {
    const fatal = output.errors.filter((entry) => entry.severity === "error");
    if (fatal.length > 0) {
      throw new Error(fatal.map((entry) => entry.formattedMessage).join("\n"));
    }
  }

  const artifact = output.contracts["EvidenceCustody.sol"]["EvidenceCustody"];
  if (!artifact || !artifact.abi || !artifact.evm?.bytecode?.object) {
    throw new Error("Failed to compile EvidenceCustody contract.");
  }

  const deployer = await provider.getSigner(0);
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying EvidenceCustody with account:", deployerAddress);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.evm.bytecode.object,
    deployer
  );
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("EvidenceCustody deployed to:", contractAddress);

  const abiPath = path.resolve(__dirname, "../contract_abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log("ABI saved to:", abiPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

