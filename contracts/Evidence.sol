// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

contract Evidence {

    enum Status { Registered, UnderReview, CourtCertified, Archived }

    struct CustodyEvent {
        address actor;
        string action;
        uint256 timestamp;
    }

    struct EvidenceRecord {
        uint256 caseId;
        string fileHash;
        string fileName;
        string description;
        address uploadedBy;
        uint256 timestamp;
        Status status;
    }

    struct CaseRecord {
        string caseTitle;
        address createdBy;
        uint256 createdAt;
        uint256 evidenceCount;
    }

    EvidenceRecord[] public evidenceList;
    CaseRecord[] public caseList;

    mapping(string => bool) private hashExists;
    mapping(uint256 => CustodyEvent[]) private custodyLog;
    mapping(uint256 => mapping(string => address)) public courtCertifications;
    mapping(uint256 => mapping(string => string)) public courtOutcomes;
    mapping(uint256 => mapping(string => uint256)) public courtTimestamps;

    event CaseCreated(uint256 indexed caseId, string caseTitle, address createdBy, uint256 timestamp);
    event EvidenceAdded(uint256 indexed evidenceId, uint256 indexed caseId, string fileHash, address uploadedBy, uint256 timestamp);
    event StatusChanged(uint256 indexed evidenceId, Status newStatus, address changedBy, uint256 timestamp);
    event CourtCertified(uint256 indexed evidenceId, string courtTier, address courtAddress, string outcome, uint256 timestamp);

    function createCase(string memory _caseTitle) public returns (uint256) {
        caseList.push(CaseRecord({
            caseTitle: _caseTitle,
            createdBy: msg.sender,
            createdAt: block.timestamp,
            evidenceCount: 0
        }));
        uint256 caseId = caseList.length - 1;
        emit CaseCreated(caseId, _caseTitle, msg.sender, block.timestamp);
        return caseId;
    }

    function getCaseCount() public view returns (uint256) {
        return caseList.length;
    }

    function getCase(uint256 _caseId) public view returns (
        string memory caseTitle,
        address createdBy,
        uint256 createdAt,
        uint256 evidenceCount
    ) {
        require(_caseId < caseList.length, "Case does not exist");
        CaseRecord memory c = caseList[_caseId];
        return (c.caseTitle, c.createdBy, c.createdAt, c.evidenceCount);
    }

    function addEvidence(
        uint256 _caseId,
        string memory _fileHash,
        string memory _fileName,
        string memory _description
    ) public returns (uint256) {
        require(_caseId < caseList.length, "Case does not exist");
        require(!hashExists[_fileHash], "Evidence with this hash already exists");

        evidenceList.push(EvidenceRecord({
            caseId: _caseId,
            fileHash: _fileHash,
            fileName: _fileName,
            description: _description,
            uploadedBy: msg.sender,
            timestamp: block.timestamp,
            status: Status.Registered
        }));

        uint256 evidenceId = evidenceList.length - 1;
        hashExists[_fileHash] = true;
        caseList[_caseId].evidenceCount += 1;

        custodyLog[evidenceId].push(CustodyEvent({
            actor: msg.sender,
            action: "Evidence Registered",
            timestamp: block.timestamp
        }));

        emit EvidenceAdded(evidenceId, _caseId, _fileHash, msg.sender, block.timestamp);
        return evidenceId;
    }

    function getEvidenceCount() public view returns (uint256) {
        return evidenceList.length;
    }

    function getEvidence(uint256 _id) public view returns (
        uint256 caseId,
        string memory fileHash,
        string memory fileName,
        string memory description,
        address uploadedBy,
        uint256 timestamp,
        Status status
    ) {
        require(_id < evidenceList.length, "Evidence does not exist");
        EvidenceRecord memory e = evidenceList[_id];
        return (e.caseId, e.fileHash, e.fileName, e.description, e.uploadedBy, e.timestamp, e.status);
    }

    function verifyEvidence(string memory _fileHash) public view returns (bool) {
        return hashExists[_fileHash];
    }

    function updateStatus(uint256 _id, Status _newStatus, string memory _note) public {
        require(_id < evidenceList.length, "Evidence does not exist");
        evidenceList[_id].status = _newStatus;

        custodyLog[_id].push(CustodyEvent({
            actor: msg.sender,
            action: _note,
            timestamp: block.timestamp
        }));

        emit StatusChanged(_id, _newStatus, msg.sender, block.timestamp);
    }

    function addCustodyEvent(uint256 _id, string memory _action) public {
        require(_id < evidenceList.length, "Evidence does not exist");
        custodyLog[_id].push(CustodyEvent({
            actor: msg.sender,
            action: _action,
            timestamp: block.timestamp
        }));
    }

    function getCustodyCount(uint256 _id) public view returns (uint256) {
        return custodyLog[_id].length;
    }

    function getCustodyEvent(uint256 _id, uint256 _index) public view returns (
        address actor,
        string memory action,
        uint256 timestamp
    ) {
        require(_index < custodyLog[_id].length, "No such custody event");
        CustodyEvent memory ev = custodyLog[_id][_index];
        return (ev.actor, ev.action, ev.timestamp);
    }

    function certifyByCourt(
        uint256 _evidenceId,
        string memory _courtTier,
        string memory _outcome
    ) public {
        require(_evidenceId < evidenceList.length, "Evidence does not exist");
        require(courtCertifications[_evidenceId][_courtTier] == address(0), "Already certified by this court tier");

        courtCertifications[_evidenceId][_courtTier] = msg.sender;
        courtOutcomes[_evidenceId][_courtTier] = _outcome;
        courtTimestamps[_evidenceId][_courtTier] = block.timestamp;

        evidenceList[_evidenceId].status = Status.CourtCertified;

        custodyLog[_evidenceId].push(CustodyEvent({
            actor: msg.sender,
            action: string(abi.encodePacked(_courtTier, " Court Certified: ", _outcome)),
            timestamp: block.timestamp
        }));

        emit CourtCertified(_evidenceId, _courtTier, msg.sender, _outcome, block.timestamp);
    }

    function getCourtCertification(uint256 _evidenceId, string memory _courtTier)
        public view returns (address courtAddress, string memory outcome, uint256 timestamp)
    {
        return (
            courtCertifications[_evidenceId][_courtTier],
            courtOutcomes[_evidenceId][_courtTier],
            courtTimestamps[_evidenceId][_courtTier]
        );
    }
}