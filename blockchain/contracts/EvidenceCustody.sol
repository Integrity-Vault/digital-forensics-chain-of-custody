// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract EvidenceCustody {
    struct Evidence {
        bytes32 hash;
        address owner;
        uint256 timestamp;
    }

    mapping(bytes32 => Evidence) private evidenceRecords;

    event EvidenceRegistered(bytes32 indexed hash, address indexed owner, uint256 timestamp);

    function registerEvidence(bytes32 _hash) external {
        require(_hash != bytes32(0), "invalid hash");
        require(evidenceRecords[_hash].timestamp == 0, "evidence already registered");

        evidenceRecords[_hash] = Evidence({
            hash: _hash,
            owner: msg.sender,
            timestamp: block.timestamp
        });

        emit EvidenceRegistered(_hash, msg.sender, block.timestamp);
    }

    function verifyEvidence(bytes32 _hash) external view returns (bool) {
        return evidenceRecords[_hash].timestamp != 0;
    }
}
