import { useState } from 'react';
import {
  AlertCircle, Loader2, Download, Upload, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { api } from '../../api';
import { format } from 'date-fns';

interface DataTabProps {
  logout: () => Promise<void>;
}

export default function DataTab({ logout }: DataTabProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `driveledger-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Data exported successfully.');
    } catch {
      setError('Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      setError('');
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await api.importData(data);
        setSuccess('Data imported successfully. Refresh the page to see changes.');
      } catch {
        setError('Failed to import data. Make sure the file is valid JSON.');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleDeleteAccount = async () => {
    if (deleteStep < 2) {
      setDeleteStep(deleteStep + 1);
      return;
    }
    try {
      await api.deleteAccount();
      await logout();
    } catch {
      setError('Failed to delete account.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
          <AlertCircle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-4 py-3">
          <CheckCircle size={18} className="text-success shrink-0" />
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Export */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-2">Export Data</h3>
        <p className="text-sm text-dark-400 mb-4">Download all your data as a JSON file.</p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 text-dark-100 font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Export JSON
        </button>
      </div>

      {/* Import */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-2">Import Data</h3>
        <p className="text-sm text-dark-400 mb-4">Import data from a previously exported JSON file. This will merge with your existing data.</p>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 text-dark-100 font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          Import JSON
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-danger/5 border border-danger/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-danger mb-2">Delete Account</h3>
        <p className="text-sm text-dark-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="flex items-center gap-2 bg-danger hover:bg-red-600 text-white font-medium rounded-lg px-5 py-2.5 transition-colors cursor-pointer"
        >
          <AlertTriangle size={18} />
          {deleteStep === 0 && 'Delete Account'}
          {deleteStep === 1 && 'Are you sure?'}
          {deleteStep === 2 && 'Click again to confirm deletion'}
        </button>
        {deleteStep > 0 && (
          <button
            onClick={() => setDeleteStep(0)}
            className="mt-2 text-sm text-dark-400 hover:text-dark-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
