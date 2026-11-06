# ForenTrace

> **Privacy-Preserving Digital Evidence Provenance, Lineage, and Chain-of-Custody Platform**  
> *Every byte has a history. Every action has proof.*

---

## Overview

**ForenTrace** is an enterprise-grade digital forensics and cyber threat intelligence platform engineered for DFIR investigators, enterprise security operations centers, and federal incident response teams.

Built to conform with **ISO/IEC 27037** electronic evidence handling standards, ForenTrace pairs **cryptographically verifiable evidence management** (streaming multi-algorithm bitstream hashing, Ed25519 digital witness signatures, Merkle audit checkpoints) with a **Three.js WebGL provenance topology matrix** and an information-dense cybersecurity workstation interface.

---

## Key Workspaces & Capabilities

- **Intelligence Command Center**: High-value operational indicator cards, live forensic worker job queues, Recharts telemetry, and central 3D evidence provenance matrix.
- **Evidence Repository**: Multi-format artifact management (raw RAM dumps, EnCase `.E01` disk images, `.pcapng` network streams, and Windows `.evtx` logs) with 1-click hash copying (MD5, SHA-1, SHA-256, SSDEEP).
- **Lineage & Provenance Graph**: Interactive node-link graph mapping adversarial execution vectors from initial exploit to lateral movement and exfiltration.
- **Hex Memory & Packet Dissector**: Low-level 16-byte aligned register inspector with parallel ASCII translation, byte representation decoding, and YARA heuristic scan triggers.
- **Chain of Custody & Legal Ledger**: Cryptographically linked custodial transfer blocks with Ed25519 witness key attestation and Merkle checkpoint verification.
- **Workstation Access Terminal**: CAC / FIDO2 hardware token and investigator credential unlock terminal.

---

## Technology Stack

### Frontend Workstation
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS Custom Variables
- **3D Engine**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), Maath (`maath/easing`)
- **Animation & Physics**: Framer Motion / Motion, GSAP
- **Data Visualization**: Recharts
- **Icons & UI**: Lucide React, Custom Dark Design System

### Backend & Cryptographic Engine
- **Framework**: Python 3.13, FastAPI, Pydantic v2
- **Cryptography**: `cryptography` (Ed25519 signatures, RFC 3161 timestamps)
- **Streaming Multi-Hasher**: Memory-safe chunked SHA-256, SHA-512, and MD5
- **Integrity Trees**: Merkle tree inclusion proofs with tamper detection
- **Testing**: Pytest, Playwright (automated multi-view browser verification)

---

## Quickstart

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ (for backend cryptographic engine)

### 1. Frontend Workstation Setup
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Backend Cryptographic Engine Setup
```bash
# Navigate to backend and install requirements
pip install fastapi uvicorn cryptography pytest pydantic-settings python-multipart

# Run automated cryptographic and API test suite
$env:PYTHONPATH="backend"; python -m pytest backend/tests/ -v

# Start FastAPI server
$env:PYTHONPATH="backend"; python -m uvicorn app.main:app --port 8000 --host 127.0.0.1
```
Interactive Swagger documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## Production Build

```bash
npm run build
```

---

## Security & Evidence Integrity Principles

1. **Original Evidence Immutability**: All evidence bitstreams are accessed in read-only binary mode (`"rb"`). Files are never modified or executed.
2. **Deterministic Cryptographic Manifests**: Canonical JSON sorting guarantees identical hash generation across distributed architectures.
3. **No Unverified Claims**: Verification statuses strictly reflect computed bitstream hashes against origin master seals.
