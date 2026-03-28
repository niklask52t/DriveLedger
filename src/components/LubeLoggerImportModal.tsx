import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api';

interface LubeLoggerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  vehicles: 'Vehicles',
  serviceRecords: 'Service Records',
  repairRecords: 'Repair Records',
  upgradeRecords: 'Upgrade Records',
  gasRecords: 'Fuel Records',
  fuelRecords: 'Fuel Records',
  odometerRecords: 'Odometer Records',
  notes: 'Notes',
  taxRecords: 'Tax Records',
  supplyRecords: 'Supply Records',
  equipmentRecords: 'Equipment Records',
  planRecords: 'Plan Records',
  reminderRecords: 'Reminder Records',
  inspectionRecords: 'Inspection Records',
};

export default function LubeLoggerImportModal({ isOpen, onClose }: LubeLoggerImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ message: string; imported: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setParsedData(null);
    setImporting(false);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError(null);
    setResult(null);

    try {
      const text = await selected.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== 'object') {
        setError('Invalid file format. Expected a JSON object.');
        return;
      }

      setFile(selected);
      setParsedData(data);

      // Build preview counts
      const counts: Record<string, number> = {};
      for (const key of Object.keys(RECORD_TYPE_LABELS)) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          counts[key] = data[key].length;
        }
      }

      if (Object.keys(counts).length === 0) {
        setError('No recognizable LubeLogger records found in this file.');
        return;
      }

      setPreview(counts);
    } catch {
      setError('Failed to parse JSON file. Please check the file format.');
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    setError(null);

    try {
      const res = await api.importFromLubeLogger(parsedData);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const totalPreview = preview ? Object.values(preview).reduce((a, b) => a + b, 0) : 0;
  const totalImported = result ? Object.values(result.imported).reduce((a, b) => a + b, 0) : 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import from LubeLogger" size="md">
      <div className="space-y-5">
        <p className="text-sm text-zinc-400">
          Import your data from a LubeLogger JSON export. This will merge imported records with your existing data.
        </p>

        {/* File upload */}
        {!result && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-6 flex flex-col items-center gap-3 transition-colors disabled:opacity-50"
            >
              {file ? (
                <>
                  <FileText size={24} className="text-violet-400" />
                  <span className="text-sm text-zinc-300">{file.name}</span>
                  <span className="text-xs text-zinc-500">Click to choose a different file</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-zinc-500" />
                  <span className="text-sm text-zinc-400">Click to select a LubeLogger JSON export</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-400/10 text-red-400 rounded-lg px-3 py-2.5 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview */}
        {preview && !result && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-300">Preview</h4>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
              {Object.entries(preview).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-zinc-400">{RECORD_TYPE_LABELS[key] || key}</span>
                  <span className="text-sm font-medium text-zinc-200">{count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/50">
                <span className="text-sm font-medium text-zinc-300">Total</span>
                <span className="text-sm font-semibold text-violet-400">{totalPreview}</span>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import {totalPreview} Records
                </>
              )}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-emerald-400/10 text-emerald-400 rounded-lg px-3 py-2.5 text-sm">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <span>Import complete! {totalImported} records imported.</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
              {Object.entries(result.imported)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-zinc-400 capitalize">{key}</span>
                    <span className="text-sm font-medium text-emerald-400">{count}</span>
                  </div>
                ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
              >
                Done
              </button>
              <button
                onClick={reset}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
              >
                Import Another
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
