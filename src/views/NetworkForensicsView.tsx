import React, { useState } from 'react';
import {
  Radio,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Wifi,
  Globe,
  FileCode,
  Download,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { SeverityBadge } from '../design-system/Badge';
import { cyberAudio } from '../lib/audio';
import { useToast } from '../design-system/Toast';

interface PacketStream {
  id: string;
  timestamp: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: string;
  sniDomain?: string;
  ja3Hash?: string;
  payloadSize: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  flag: string;
}

const MOCK_PACKETS: PacketStream[] = [
  {
    id: 'PKT-1082',
    timestamp: '14:28:12.482 UTC',
    srcIp: '192.168.1.45',
    srcPort: 49821,
    dstIp: '185.220.101.5',
    dstPort: 443,
    protocol: 'TLS 1.3',
    sniDomain: 'api.telemetry-update-services.cc',
    ja3Hash: 'ada70206e40642a3e4461f35503039d4',
    payloadSize: '2.84 KB',
    threatLevel: 'CRITICAL',
    flag: 'COBALT_STRIKE_MALLEABLE_C2',
  },
  {
    id: 'PKT-1083',
    timestamp: '14:28:15.110 UTC',
    srcIp: '192.168.1.45',
    srcPort: 52104,
    dstIp: '8.8.8.8',
    dstPort: 53,
    protocol: 'DNS',
    sniDomain: 'exfil-chunk-01.a89b.attacker-c2.net',
    payloadSize: '142 B',
    threatLevel: 'HIGH',
    flag: 'DNS_TUNNELING_EXFIL',
  },
  {
    id: 'PKT-1084',
    timestamp: '14:28:22.905 UTC',
    srcIp: '192.168.1.10',
    srcPort: 445,
    dstIp: '192.168.1.45',
    dstPort: 49182,
    protocol: 'SMBv3',
    payloadSize: '18.4 MB',
    threatLevel: 'HIGH',
    flag: 'LATERAL_NAMED_PIPE_IMPERSONATION',
  },
  {
    id: 'PKT-1085',
    timestamp: '14:29:01.002 UTC',
    srcIp: '192.168.1.45',
    srcPort: 50112,
    dstIp: '104.244.42.1',
    dstPort: 443,
    protocol: 'TLS 1.3',
    sniDomain: 'api.twitter.com',
    payloadSize: '4.1 KB',
    threatLevel: 'INFORMATIONAL',
    flag: 'STANDARD_WEB_TRAFFIC',
  },
];

export const NetworkForensicsView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedPacket, setSelectedPacket] = useState<PacketStream>(MOCK_PACKETS[0]);
  const [search, setSearch] = useState('');

  const filteredPackets = MOCK_PACKETS.filter(
    (p) =>
      p.srcIp.includes(search) ||
      p.dstIp.includes(search) ||
      p.protocol.toLowerCase().includes(search.toLowerCase()) ||
      p.flag.toLowerCase().includes(search.toLowerCase()) ||
      (p.sniDomain && p.sniDomain.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>NETWORK FORENSICS & PCAP STREAM DISSECTOR</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Reconstructed TCP/UDP streams, TLS handshake JA3 fingerprints, and C2 beacon frequency analyzer.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            cyberAudio.playScan(600);
            showToast({
              type: 'info',
              title: 'PCAP Flow Filtered',
              description: 'Exported Wireshark-compatible filter file: tcp.stream eq 4',
            });
          }}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Export Stream (.PCAPNG)
        </Button>
      </div>

      {/* Traffic Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <div className="font-mono text-xs text-slate-400">TOTAL CAPTURED PACKETS</div>
          <div className="font-mono font-bold text-lg text-slate-900 dark:text-white mt-1">
            2,481,092
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            1.42 GB WIRE VOLUME
          </div>
        </Card>
        <Card>
          <div className="font-mono text-xs text-slate-400">ACTIVE C2 BEACONS</div>
          <div className="font-mono font-bold text-lg text-[#B74D55] dark:text-[#C66B70] mt-1">
            1 DETECTED
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            CADENCE: 30.0s (JITTER: 10%)
          </div>
        </Card>
        <Card>
          <div className="font-mono text-xs text-slate-400">DNS TUNNELING EXFIL</div>
          <div className="font-mono font-bold text-lg text-[#A9772D] dark:text-[#C69A54] mt-1">
            14.2 MB ENCODED
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            BASE64 TXT QUERIES
          </div>
        </Card>
        <Card>
          <div className="font-mono text-xs text-slate-400">JA3 TLS CORRELATION</div>
          <div className="font-mono font-bold text-lg text-[#337D5C] dark:text-[#4D9B78] mt-1">
            1 MATCH FOUND
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            COBALT STRIKE PROFILE
          </div>
        </Card>
      </div>

      {/* Packet Grid & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 rounded-xl bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50 dark:bg-[#171B22] border-b border-slate-200 dark:border-[#303743] font-mono text-[11px] text-slate-500 dark:text-[#9AA4B2]">
                <tr>
                  <th className="py-3 px-4 font-medium">PKT ID</th>
                  <th className="py-3 px-4 font-medium">SOURCE ➔ DESTINATION</th>
                  <th className="py-3 px-4 font-medium">PROTO</th>
                  <th className="py-3 px-4 font-medium">FLAG / FINDING</th>
                  <th className="py-3 px-4 text-right font-medium">SEVERITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#303743]/60 font-mono text-xs">
                {filteredPackets.map((pkt) => {
                  const isSelected = selectedPacket.id === pkt.id;

                  return (
                    <tr
                      key={pkt.id}
                      onClick={() => {
                        setSelectedPacket(pkt);
                        cyberAudio.playClick(880, 0.04);
                      }}
                      className={`hover:bg-slate-50 dark:hover:bg-[#242B36] transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-50 dark:bg-[#222935]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-[#416F9E] dark:text-[#648DBB] font-bold">
                        {pkt.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white font-medium">
                          {pkt.srcIp}:{pkt.srcPort} ➔ {pkt.dstIp}:{pkt.dstPort}
                        </div>
                        {pkt.sniDomain && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                            SNI: {pkt.sniDomain}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] text-[10px]">
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {pkt.flag}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <SeverityBadge severity={pkt.threatLevel} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Packet Stream Inspector */}
        <div className="lg:col-span-4 rounded-xl bg-white dark:bg-[#1D232C] border border-[#416F9E]/30 dark:border-[#648DBB]/40 p-5 shadow-sm space-y-4 font-mono text-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-[#303743]">
            <div className="text-[10px] text-slate-400">PACKET TELEMETRY DETAIL</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
              {selectedPacket.id} [{selectedPacket.protocol}]
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-[10px] block">CONVERSATION SOCKET:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {selectedPacket.srcIp}:{selectedPacket.srcPort} ➔ {selectedPacket.dstIp}:{selectedPacket.dstPort}
              </span>
            </div>

            {selectedPacket.sniDomain && (
              <div>
                <span className="text-slate-400 text-[10px] block">TLS SERVER NAME INDICATION (SNI):</span>
                <span className="text-[#416F9E] dark:text-[#648DBB] font-bold break-all">
                  {selectedPacket.sniDomain}
                </span>
              </div>
            )}

            {selectedPacket.ja3Hash && (
              <div>
                <span className="text-slate-400 text-[10px] block">JA3 CLIENT FINGERPRINT HASH:</span>
                <span className="text-slate-700 dark:text-slate-300 break-all select-all font-mono">
                  {selectedPacket.ja3Hash}
                </span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-red-50 dark:bg-[#2C181A] border border-[#B74D55]/30 text-[#B74D55] dark:text-[#C66B70]">
              <div className="font-bold text-[10px]">HEURISTIC THREAT CORRELATION</div>
              <p className="mt-1 font-sans text-xs leading-relaxed">
                Matches Cobalt Strike Beacon HTTPS malleable profile with beaconing periodicity of 30.0s and 10% jitter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkForensicsView;
