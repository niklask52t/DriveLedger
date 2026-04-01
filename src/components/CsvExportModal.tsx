import { useState } from 'react';
import { Download, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api';
import type { Vehicle } from '../types';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
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

export default function CsvExportModal({ isOpen, onClose, vehicles }: CsvExportModalProps) {
  const [recordType, setRecordType] = useState('costs');
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function reset() {
    setRecordType('costs');
    setVehicleId('');
    setStartDate('');
    setEndDate('');
    setError('');
    setDone(false);
  }

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const params: { vehicleId?: string; startDate?: string; endDate?: string } = {};
      if (vehicleId) params.vehicleId = vehicleId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const csvText = await api.exportCsv(recordType, params);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordType}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Export CSV" size="lg" footer={
      done ? (
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
        >
          Close
        </button>
      ) : (
        <>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export'}
            <Download size={16} />
          </button>
        </>
      )
    }>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {done ? (
        <div className="text-center py-8 space-y-4">
          <CheckCircle size={48} className="mx-auto text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Export Complete</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Your {RECORD_TYPE_LABELS[recordType]} CSV has been downloaded.
            </p>
          </div>
        </div>
      ) : (
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

          {/* Vehicle filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Vehicle (optional)</label>
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">All vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name || `${v.brand} ${v.model}`}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Start Date (optional)</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">End Date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
