import React, { useState } from 'react';
import {
  Layers,
  Search,
  HardDrive,
  FileText,
  FileCode,
  CornerDownRight,
  ShieldCheck,
  Folder,
  Download,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';

interface MftEntry {
  recordNumber: number;
  fileName: string;
  filePath: string;
  fileSize: string;
  created: string;
  modified: string;
  isDeleted: boolean;
  hasAlternateStream: boolean;
}

const MOCK_MFT: MftEntry[] = [
  {
    recordNumber: 49201,
    fileName: 'svchost_stub.exe',
    filePath: 'C:\\Windows\\Temp\\svchost_stub.exe',
    fileSize: '48.5 KB',
    created: '2026-11-09 14:12:08 UTC',
    modified: '2026-11-09 14:12:08 UTC',
    isDeleted: true,
    hasAlternateStream: true,
  },
  {
    recordNumber: 49202,
    fileName: 'mimikatz.ps1:Zone.Identifier',
    filePath: 'C:\\Users\\Administrator\\Downloads\\mimikatz.ps1',
    fileSize: '124 B',
    created: '2026-11-09 14:15:32 UTC',
    modified: '2026-11-09 14:15:32 UTC',
    isDeleted: false,
    hasAlternateStream: true,
  },
  {
    recordNumber: 49205,
    fileName: 'sam.bak',
    filePath: 'C:\\Windows\\System32\\config\\RegBack\\SAM',
    fileSize: '48.0 KB',
    created: '2026-11-08 22:00:15 UTC',
    modified: '2026-11-08 22:00:15 UTC',
    isDeleted: false,
    hasAlternateStream: false,
  },
  {
    recordNumber: 49209,
    fileName: 'shadow_copy_exfil.zip',
    filePath: 'C:\\Users\\Public\\shadow_copy_exfil.zip',
    fileSize: '184.2 MB',
    created: '2026-11-09 14:26:40 UTC',
    modified: '2026-11-09 14:28:11 UTC',
    isDeleted: true,
    hasAlternateStream: false,
  },
  {
    recordNumber: 49214,
    fileName: '$LogFile',
    filePath: 'C:\\$LogFile',
    fileSize: '64.0 MB',
    created: '2026-01-01 00:00:00 UTC',
    modified: '2026-11-09 14:32:00 UTC',
    isDeleted: false,
    hasAlternateStream: false,
  },
];

export const DiskForensicsView: React.FC = () => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [showDeletedOnly, setShowDeletedOnly] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MftEntry>(MOCK_MFT[0]);

  const filteredEntries = MOCK_MFT.filter((e) => {
    const matchesSearch =
      e.fileName.toLowerCase().includes(search.toLowerCase()) ||
      e.filePath.toLowerCase().includes(search.toLowerCase());
    const matchesDeleted = !showDeletedOnly || e.isDeleted;
    return matchesSearch && matchesDeleted;
  });

  const handleCarve = (entry: MftEntry) => {
    cyberAudio.playScan(740);
    showToast({
      type: 'success',
      title: `File Carved from Unallocated Slack: ${entry.fileName}`,
      description: `Recovered ${entry.fileSize} bytes. Verified against NTFS $MFT record #${entry.recordNumber}`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>DISK FORENSICS & FILE SYSTEM DISSECTOR</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            NTFS $MFT record parser, unallocated cluster carving, and alternate data stream (ADS) extractor.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] text-slate-700 dark:text-slate-300">
            FS: NTFS v3.1 (512B Clusters)
          </span>
        </div>
      </div>

      {/* Partitions & VSS Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="font-mono text-xs text-slate-400">PARTITION 01</div>
          <div className="font-mono font-bold text-lg text-slate-900 dark:text-white mt-1">
            C: (OS_SYSTEM)
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            931.5 GB • 84.2% ALLOCATED
          </div>
        </Card>
        <Card>
          <div className="font-mono text-xs text-slate-400">VOLUME SHADOW COPIES</div>
          <div className="font-mono font-bold text-lg text-[#337D5C] dark:text-[#4D9B78] mt-1">
            3 VSS SNAPSHOTS
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            OLDEST: 48 HOURS AGO
          </div>
        </Card>
        <Card>
          <div className="font-mono text-xs text-slate-400">CARVABLE DELETED CLUSTERS</div>
          <div className="font-mono font-bold text-lg text-[#B74D55] dark:text-[#C66B70] mt-1">
            14.2 GB SLACK
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            2,480 POTENTIAL RECOVERIES
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search NTFS $MFT by filename, path, or extension..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] font-mono text-xs focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
          />
        </div>

        <button
          onClick={() => setShowDeletedOnly(!showDeletedOnly)}
          className={`px-3 py-2 rounded-lg font-mono text-xs transition-colors cursor-pointer border ${
            showDeletedOnly
              ? 'bg-[#FDF0F1] dark:bg-[#2C181A] text-[#B74D55] dark:text-[#C66B70] border-[#B74D55]/40'
              : 'bg-white dark:bg-[#1D232C] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-[#303743]'
          }`}
        >
          {showDeletedOnly ? 'SHOWING DELETED ONLY' : 'SHOW ALL ENTRIES'}
        </button>
      </div>

      {/* MFT Master Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 rounded-xl bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50 dark:bg-[#171B22] border-b border-slate-200 dark:border-[#303743] font-mono text-[11px] text-slate-500 dark:text-[#9AA4B2]">
                <tr>
                  <th className="py-3 px-4 font-medium">RECORD #</th>
                  <th className="py-3 px-4 font-medium">FILENAME & PATH</th>
                  <th className="py-3 px-4 font-medium">SIZE</th>
                  <th className="py-3 px-4 font-medium">STATUS</th>
                  <th className="py-3 px-4 text-right font-medium">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#303743]/60 font-mono text-xs">
                {filteredEntries.map((entry) => {
                  const isSelected = selectedEntry.recordNumber === entry.recordNumber;

                  return (
                    <tr
                      key={entry.recordNumber}
                      onClick={() => {
                        setSelectedEntry(entry);
                        cyberAudio.playClick(880, 0.04);
                      }}
                      className={`hover:bg-slate-50 dark:hover:bg-[#242B36] transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-50 dark:bg-[#222935]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-[#416F9E] dark:text-[#648DBB] font-bold">
                        #{entry.recordNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                          {entry.fileName}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                          {entry.filePath}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{entry.fileSize}</td>
                      <td className="py-3 px-4">
                        {entry.isDeleted ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-[#FDF0F1] dark:bg-[#2C181A] text-[#B74D55] dark:text-[#C66B70] border border-[#B74D55]/30 font-bold">
                            DELETED
                          </span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-[#EAF5F0] dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78] border border-[#337D5C]/30 font-bold">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCarve(entry);
                          }}
                          className="px-2.5 py-1 rounded bg-[#EBF2F9] dark:bg-[#1A2838] hover:bg-[#DCE7F3] dark:hover:bg-[#23354B] text-[#416F9E] dark:text-[#648DBB] border border-[#416F9E]/30 text-[10px] font-bold tracking-wider cursor-pointer"
                        >
                          CARVE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Record Deep Details */}
        <div className="lg:col-span-4 rounded-xl bg-white dark:bg-[#1D232C] border border-[#416F9E]/30 dark:border-[#648DBB]/40 p-5 shadow-sm space-y-4 font-mono text-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-[#303743]">
            <div className="text-[10px] text-slate-400">$MFT RECORD HEADER</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 break-all">
              {selectedEntry.fileName}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-[10px] block">FULL CANONICAL PATH:</span>
              <span className="text-slate-700 dark:text-slate-300 break-all">{selectedEntry.filePath}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block">$STANDARD_INFO CREATED:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedEntry.created}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">$FILE_NAME MODIFIED:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedEntry.modified}</span>
              </div>
            </div>

            {selectedEntry.hasAlternateStream && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/40 text-amber-800 dark:text-amber-300">
                <div className="font-bold text-[10px]">ALTERNATE DATA STREAM (ADS) DETECTED</div>
                <div className="text-[11px] mt-1 font-sans">
                  Contains secondary zone identifier payload or stealth persistence hook.
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => handleCarve(selectedEntry)}
                icon={<Download className="w-4 h-4" />}
              >
                Extract Recovered Raw Bytes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiskForensicsView;
