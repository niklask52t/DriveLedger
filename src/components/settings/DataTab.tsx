import { useState, useRef } from 'react';
import { Loader2, AlertTriangle, Check, DatabaseBackup, RotateCcw } from 'lucide-react';
import { api } from '../../api';

export default function DataTab() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleFullBackup = async () => {
    setBackingUp(true);
    setMessage(null);
    try {
      const data = await api.fullBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `driveledger-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Full backup downloaded successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create backup.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setShowRestoreConfirm(true);
    if (restoreInputRef.current) restoreInputRef.current.value = '';
  };

  const handleFullRestore = async () => {
    if (restoreText !== 'RESTORE' || !restoreFile) return;
    setRestoring(true);
    setMessage(null);
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);
      const data = backup.data || backup;
      await api.fullRestore(data);
      setMessage({ type: 'success', text: 'Full restore completed successfully. Refreshing...' });
      setShowRestoreConfirm(false);
      setRestoreFile(null);
      setRestoreText('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore backup.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setRestoring(false);
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

      {/* Full Backup */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Full Database Backup</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Download a complete backup of the entire database including all users and data. Admin only.
        </p>
        <button
          onClick={handleFullBackup}
          disabled={backingUp}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {backingUp ? <Loader2 size={16} className="animate-spin" /> : <DatabaseBackup size={16} />}
          Full Backup
        </button>
      </div>

      {/* Full Restore */}
      <div className="bg-zinc-900 border border-amber-400/20 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-amber-400 mb-2">Restore from Backup</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Restore the entire database from a full backup file. This will replace ALL existing data. Admin only.
        </p>
        <input
          ref={restoreInputRef}
          type="file"
          accept=".json"
          onChange={handleRestoreFileSelect}
          className="hidden"
        />

        {!showRestoreConfirm ? (
          <button
            onClick={() => restoreInputRef.current?.click()}
            disabled={restoring}
            className="bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {restoring ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            Restore from Backup
          </button>
        ) : (
          <div className="space-y-4 max-w-md">
            <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-400">
                  This will replace ALL data in the database with the backup contents.
                  File: <strong>{restoreFile?.name}</strong>. Type <strong>RESTORE</strong> to confirm.
                </p>
              </div>
            </div>
            <input
              type="text"
              className="w-full h-10 bg-zinc-950 border border-amber-400/30 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400/50"
              placeholder='Type "RESTORE" to confirm'
              value={restoreText}
              onChange={(e) => setRestoreText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleFullRestore}
                disabled={restoring || restoreText !== 'RESTORE'}
                className="bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {restoring && <Loader2 size={16} className="animate-spin" />}
                Restore Database
              </button>
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setRestoreFile(null);
                  setRestoreText('');
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
