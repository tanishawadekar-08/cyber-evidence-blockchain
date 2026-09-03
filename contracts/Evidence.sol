// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

contract Evidence {

    struct EvidenceRecord {
        string fileHash;
        string fileName;
        string description;
        address uploadedBy;
        uint256 timestamp;
    }

    EvidenceRecord[] public evidenceList;

    mapping(string => bool) private hashExists;

    event EvidenceAdded(
        uint256 indexed id,
        string fileHash,
        string fileName,
        address uploadedBy,
        uint256 timestamp
    );

    function addEvidence(
        string memory _fileHash,
        string memory _fileName,
        string memory _description
    ) public returns (uint256) {
        require(!hashExists[_fileHash], "Evidence with this hash already exists");

        evidenceList.push(EvidenceRecord({
            fileHash: _fileHash,
            fileName: _fileName,
            description: _description,
            uploadedBy: msg.sender,
            timestamp: block.timestamp
        }));

        hashExists[_fileHash] = true;

        uint256 newId = evidenceList.length - 1;

        emit EvidenceAdded(newId, _fileHash, _fileName, msg.sender, block.timestamp);

        return newId;
    }

    function getEvidenceCount() public view returns (uint256) {
        return evidenceList.length;
    }

    function getEvidence(uint256 _id) public view returns (
        string memory fileHash,
        string memory fileName,
        string memory description,
        address uploadedBy,
        uint256 timestamp
    ) {
        require(_id < evidenceList.length, "Evidence does not exist");
        EvidenceRecord memory record = evidenceList[_id];
        return (
            record.fileHash,
            record.fileName,
            record.description,
            record.uploadedBy,
            record.timestamp
        );
    }

    function verifyEvidence(string memory _fileHash) public view returns (bool) {
        return hashExists[_fileHash];
    }
}