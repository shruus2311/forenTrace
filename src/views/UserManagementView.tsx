import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  Key,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';

interface ForensicUser {
  id: string;
  name: string;
  email: string;
  role: 'DFIR_LEAD' | 'FORENSIC_EXAMINER' | 'EVIDENCE_CUSTODIAN' | 'LEGAL_AUDITOR';
  pkiKeyId: string;
  status: 'ACTIVE' | 'REVOKED' | 'SUSPENDED';
  mfaMethod: 'FIDO2_CAC' | 'HARDWARE_YUBIKEY';
  lastActive: string;
}

const MOCK_USERS: ForensicUser[] = [
  {
    id: 'USR-9082',
    name: 'V. Raghunath',
    email: 'v.raghunath@forentrace.gov',
    role: 'DFIR_LEAD',
    pkiKeyId: 'KEY:FIPS140-3:9082',
    status: 'ACTIVE',
    mfaMethod: 'FIDO2_CAC',
    lastActive: 'Active Now',
  },
  {
    id: 'USR-4011',
    name: 'M. Henderson',
    email: 'm.henderson@forentrace.gov',
    role: 'FORENSIC_EXAMINER',
    pkiKeyId: 'KEY:FIPS140-3:4011',
    status: 'ACTIVE',
    mfaMethod: 'HARDWARE_YUBIKEY',
    lastActive: '14 mins ago',
  },
  {
    id: 'USR-2204',
    name: 'S. Al-Mansoor',
    email: 's.almansoor@forentrace.gov',
    role: 'EVIDENCE_CUSTODIAN',
    pkiKeyId: 'KEY:FIPS140-3:2204',
    status: 'ACTIVE',
    mfaMethod: 'FIDO2_CAC',
    lastActive: '1 hr ago',
  },
  {
    id: 'USR-1090',
    name: 'Hon. Justice E. Vance',
    email: 'evance@tribunal.judiciary.gov',
    role: 'LEGAL_AUDITOR',
    pkiKeyId: 'KEY:FIPS140-3:1090',
    status: 'ACTIVE',
    mfaMethod: 'FIDO2_CAC',
    lastActive: 'Yesterday',
  },
];

export const UserManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');

  const filteredUsers = MOCK_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>USER ACCESS & ROLE-BASED ACCESS CONTROL (RBAC)</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Enclave-backed PKI identities, cryptographic signing authorities, and investigator credential management.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            cyberAudio.playClick(900, 0.05);
            showToast({
              type: 'info',
              title: 'PKI Certificate Provisioning Initialized',
              description: 'Enroll new FIPS 140-3 CAC / PIV hardware credential.',
            });
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Enroll Investigator Certificate
        </Button>
      </div>

      {/* Role Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
        <Card>
          <div className="text-slate-400">DFIR LEADS</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">1 ENROLLED</div>
          <div className="text-[11px] text-slate-500 mt-1">FULL SIGNING AUTHORITY</div>
        </Card>
        <Card>
          <div className="text-slate-400">FORENSIC EXAMINERS</div>
          <div className="text-xl font-bold text-[#416F9E] dark:text-[#648DBB] mt-1">4 ENROLLED</div>
          <div className="text-[11px] text-slate-500 mt-1">DISSECT & CARVE PERM</div>
        </Card>
        <Card>
          <div className="text-slate-400">VAULT CUSTODIANS</div>
          <div className="text-xl font-bold text-[#337D5C] dark:text-[#4D9B78] mt-1">2 ENROLLED</div>
          <div className="text-[11px] text-slate-500 mt-1">PHYSICAL CUSTODY SEAL</div>
        </Card>
        <Card>
          <div className="text-slate-400">LEGAL AUDITORS</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">1 ENROLLED</div>
          <div className="text-[11px] text-slate-500 mt-1">READ-ONLY VERIFICATION</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search authorized examiners by name, email, or role..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] font-mono text-xs focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-slate-50 dark:bg-[#171B22] border-b border-slate-200 dark:border-[#303743] font-mono text-[11px] text-slate-500 dark:text-[#9AA4B2]">
              <tr>
                <th className="py-3 px-4 font-medium">INVESTIGATOR IDENTITY</th>
                <th className="py-3 px-4 font-medium">ASSIGNED ROLE</th>
                <th className="py-3 px-4 font-medium">PKI CERTIFICATE FINGERPRINT</th>
                <th className="py-3 px-4 font-medium">MFA ENCLAVE</th>
                <th className="py-3 px-4 text-right font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#303743]/60 font-mono text-xs">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#242B36] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{user.email} • {user.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#416F9E] dark:text-[#648DBB] font-mono text-[11px]">
                    {user.pkiKeyId}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                    {user.mfaMethod}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-[#EAF5F0] dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78] border border-[#337D5C]/30 font-bold">
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagementView;
