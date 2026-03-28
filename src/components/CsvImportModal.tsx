import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api';
import type { Vehicle } from '../types';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onImportComplete?: () => void;
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  costs: 'Costs',
  loans: 'Loans',
  repairs: 'Repairs',
  services: 'Services',
  upgrades: 'Upgrades',
  'fuel-records': 'Fuel Records',
  'odometer-records': 'Odometer Records',
  taxes: 'Tax Records',
  supplies: 'Supplies',
  equipment: 'Equipment',
  inspections: 'Inspections',
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCsvPreview(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    rows.push(parseCsvLine(lines[i]).map(v => v.trim()));
  }
  return { headers, rows };
}

export default function CsvImportModal({ isOpen, onClose, vehicles, onImportComplete }: CsvImportModalProps) {
  const [recordType, setRecordType] = useState('costs');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [targetColumns, setTargetColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  // Load available columns when record type changes
  useEffect(() => {
    if (!isOpen) return;
    api.getCsvRecordTypes().then(types => {
      const found = types.find(t => t.key === recordType);
      if (found) setTargetColumns(found.columns);
    }).catch(() => { /* ignore */ });
  }, [recordType, isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCsvText('');
      setFileName('');
      setPreview(null);
      setMapping({});
      setResult(null);
      setError('');
      setStep('upload');
    }
  }, [isOpen]);

  // Parse preview when CSV text changes
  useEffect(() => {
    if (csvText) {
      const p = parseCsvPreview(csvText);
      setPreview(p);
      // Auto-map headers: try to match to target columns
      const autoMap: Record<string, string> = {};
      for (const header of p.headers) {
        const lower = header.toLowerCase().replace(/[\s_-]+/g, '');
        for (const col of targetColumns) {
          const colLower = col.toLowerCase().replace(/[\s_-]+/g, '');
          if (lower === colLower) {
            autoMap[header] = col;
            break;
          }
        }
      }
      setMapping(autoMap);
    } else {
      setPreview(null);
      setMapping({});
    }
  }, [csvText, targetColumns]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(reader.result as string);
    };
    reader.readAsText(file);
  }

  async function handleDownloadSample() {
    try {
      const csv = await api.getCsvSample(recordType);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordType}-sample.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download sample');
    }
  }

  async function handleImport() {
    setImporting(true);
    setError('');
    try {
      // Build mapping object: CSV header -> camelCase field name
      const mappingObj: Record<string, string> = {};
      for (const [csvHeader, fieldName] of Object.entries(mapping)) {
        if (fieldName) {
          mappingObj[csvHeader] = fieldName;
        }
      }
      const res = await api.importCsv(recordType, csvText, Object.keys(mappingObj).length > 0 ? mappingObj : undefined);
      setResult(res);
      setStep('done');
      onImportComplete?.();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const totalRows = csvText
    ? csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '').length - 1
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import CSV" size="3xl" footer={
      step === 'upload' && preview && preview.rows.length > 0 ? (
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setStep('map')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Next: Map Columns <ArrowRight size={16} />
          </button>
        </>
      ) : step === 'map' ? (
        <>
          <button
            onClick={() => setStep('upload')}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {importing ? 'Importing...' : `Import ${totalRows} Record${totalRows !== 1 ? 's' : ''}`}
            <Upload size={16} />
          </button>
        </>
      ) : step === 'done' ? (
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
        >
          Close
        </button>
      ) : undefined
    }>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-5">
          {/* Record type selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Record Type</label>
            <select
              value={recordType}
              onChange={e => setRecordType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {Object.entries(RECORD_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">CSV File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {fileName ? (
                <div className="flex items-center justify-center gap-2 text-zinc-300">
                  <FileText size={20} />
                  <span className="text-sm">{fileName}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={28} className="mx-auto text-zinc-500" />
                  <p className="text-sm text-zinc-500">Click to select a CSV file</p>
                </div>
              )}
            </div>
          </div>

          {/* Download sample */}
          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Download size={14} />
            Download sample CSV for {RECORD_TYPE_LABELS[recordType]}
          </button>

          {/* Preview table */}
          {preview && preview.rows.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Preview ({totalRows} total rows)</h3>
              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-800/50">
                      {preview.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left text-zinc-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-t border-zinc-800/50">
                        {preview.headers.map((_, j) => (
                          <td key={j} className="px-3 py-1.5 text-zinc-300 whitespace-nowrap max-w-[200px] truncate">{row[j] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'map' && preview && (
        <div className="space-y-5">
          <p className="text-sm text-zinc-400">
            Map each CSV column to a record field. Unmapped columns will be skipped.
          </p>

          <div className="space-y-3">
            {preview.headers.map((header) => (
              <div key={header} className="flex items-center gap-3">
                <span className="w-1/3 text-sm text-zinc-300 truncate font-mono bg-zinc-800 px-2 py-1.5 rounded">{header}</span>
                <ArrowRight size={14} className="text-zinc-600 shrink-0" />
                <select
                  value={mapping[header] || ''}
                  onChange={e => setMapping(prev => ({ ...prev, [header]: e.target.value }))}
                  className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="">-- Skip --</option>
                  {targetColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Quick preview of first mapped row */}
          {preview.rows.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">First row mapped values:</h3>
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1 text-xs">
                {Object.entries(mapping).filter(([, v]) => v).map(([csvHeader, field]) => {
                  const idx = preview.headers.indexOf(csvHeader);
                  const val = idx >= 0 ? (preview.rows[0]?.[idx] ?? '') : '';
                  return (
                    <div key={csvHeader} className="flex gap-2">
                      <span className="text-zinc-500 w-40 truncate">{field}:</span>
                      <span className="text-zinc-300">{val || '(empty)'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'done' && result && (
        <div className="text-center py-8 space-y-4">
          <CheckCircle size={48} className="mx-auto text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Import Complete</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Successfully imported {result.count} {RECORD_TYPE_LABELS[recordType]} record{result.count !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
