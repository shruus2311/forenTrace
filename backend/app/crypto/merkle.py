import hashlib
from typing import List, Tuple, Dict, Any
from pydantic import BaseModel

def hash_pair(left_hex: str, right_hex: str) -> str:
    """Combines and hashes two hex hashes to form a parent node."""
    combined = (left_hex + right_hex).encode("utf-8")
    return hashlib.sha256(combined).hexdigest()

def hash_leaf(data_bytes: bytes) -> str:
    """Hashes a single evidence / custody record payload to create a leaf."""
    return hashlib.sha256(data_bytes).hexdigest()

class MerkleProof(BaseModel):
    leaf_hash: str
    root_hash: str
    audit_path: List[Tuple[str, str]]  # list of (sibling_hash, 'L' | 'R')
    is_valid: bool

class MerkleTree:
    """
    Cryptographic Merkle Tree for Tamper-Evident Chain-of-Custody Checkpointing.
    Enables O(log N) inclusion proofs and zero-knowledge integrity verification.
    """
    def __init__(self, leaves: List[str] | None = None):
        self.leaves: List[str] = leaves or []
        self.levels: List[List[str]] = []
        if self.leaves:
            self._build_tree()

    def add_leaf(self, leaf_hash: str) -> None:
        self.leaves.append(leaf_hash.strip().lower())
        self._build_tree()

    def _build_tree(self) -> None:
        if not self.leaves:
            self.levels = [[]]
            return

        current_level = list(self.leaves)
        self.levels = [current_level]

        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                if i + 1 < len(current_level):
                    right = current_level[i + 1]
                else:
                    # Odd number of nodes: duplicate last node (standard Bitcoin/Certificate Transparency rule)
                    right = left
                next_level.append(hash_pair(left, right))
            current_level = next_level
            self.levels.append(current_level)

    @property
    def root(self) -> str | None:
        if not self.levels or not self.levels[-1]:
            return None
        return self.levels[-1][0]

    def get_proof(self, index: int) -> MerkleProof:
        """Generates an audit inclusion proof for a leaf at a given index."""
        if index < 0 or index >= len(self.leaves):
            raise IndexError("Leaf index out of bounds")

        target_leaf = self.leaves[index]
        audit_path: List[Tuple[str, str]] = []
        curr_idx = index

        for level in self.levels[:-1]:
            is_right_child = (curr_idx % 2 == 1)
            if is_right_child:
                sibling = level[curr_idx - 1]
                audit_path.append((sibling, "L"))
            else:
                if curr_idx + 1 < len(level):
                    sibling = level[curr_idx + 1]
                else:
                    sibling = level[curr_idx]
                audit_path.append((sibling, "R"))
            curr_idx //= 2

        root_hash = self.root or ""
        is_valid = self.verify_proof(target_leaf, audit_path, root_hash)

        return MerkleProof(
            leaf_hash=target_leaf,
            root_hash=root_hash,
            audit_path=audit_path,
            is_valid=is_valid
        )

    @staticmethod
    def verify_proof(leaf_hash: str, audit_path: List[Tuple[str, str]], expected_root: str) -> bool:
        """Verifies a Merkle inclusion proof independently."""
        current = leaf_hash
        for sibling_hash, direction in audit_path:
            if direction == "L":
                current = hash_pair(sibling_hash, current)
            else:
                current = hash_pair(current, sibling_hash)
        return current.lower() == expected_root.lower()
