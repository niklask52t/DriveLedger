import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Loader2, AlertTriangle, Check } from 'lucide-react';
import { api } from '../../api';

interface DataTabProps {
  logout: () => void;
}

export default function DataTab({ logout }: DataTabProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `driveledger-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Data exported successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export data.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importData(data);
      setMessage({ type: 'success', text: 'Data imported successfully. Refreshing...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import data.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleting(true);
    setMessage(null);
    try {
      await api.deleteAccount();
      logout();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.';
      setMessage({ type: 'error', text: msg });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-400/10 text-emerald-400'
              : 'bg-red-400/10 text-red-400'
          }`}
        >
          {message.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}

      {/* Export */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Export Data</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Download all your data as a JSON file. This includes vehicles, costs, loans, repairs, savings, and planned purchases.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export JSON
        </button>
      </div>

      {/* Import */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Import Data</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Restore data from a previously exported JSON file. This will merge with your existing data.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Import JSON
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-zinc-900 border border-red-400/20 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} />
            Delete Account
          </button>
        ) : (
          <div className="space-y-4 max-w-md">
            <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">
                  This will permanently delete your account, all vehicles, costs, loans, repairs, savings goals, and planned purchases. Type <strong>DELETE</strong> to confirm.
                </p>
              </div>
            </div>
            <input
              type="text"
              className="w-full h-10 bg-zinc-950 border border-red-400/30 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-red-400/50"
              placeholder='Type "DELETE" to confirm'
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteText !== 'DELETE'}
                className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                Delete My Account
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText('');
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
