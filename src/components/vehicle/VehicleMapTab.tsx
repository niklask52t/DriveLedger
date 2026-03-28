import { useState, useMemo } from 'react';
import { Plus, Trash2, Tag, Search, X } from 'lucide-react';
import type { AppState, Vehicle, MapZone, VehicleMapData } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';

interface VehicleMapTabProps {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const inputCls = 'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';
const labelCls = 'block text-sm font-medium text-zinc-400 mb-2';

export default function VehicleMapTab({ vehicleId, state, setState }: VehicleMapTabProps) {
  const { t } = useI18n();
  const vehicle = state.vehicles.find(v => v.id === vehicleId);
  const mapData: VehicleMapData = vehicle?.mapData || { imageUrl: '', zones: [] };

  const [imageUrlInput, setImageUrlInput] = useState(mapData.imageUrl);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneTags, setNewZoneTags] = useState('');
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);

  // All records that have tags for this vehicle
  const allTaggedRecords = useMemo(() => {
    const records: { type: string; description: string; date: string; cost: number; tags: string[] }[] = [];

    state.serviceRecords.filter(r => r.vehicleId === vehicleId).forEach(r => {
      if (r.tags?.length) records.push({ type: 'Service', description: r.description, date: r.date, cost: r.cost, tags: r.tags });
    });
    state.repairs.filter(r => r.vehicleId === vehicleId).forEach(r => {
      if (r.tags?.length) records.push({ type: 'Repair', description: r.description, date: r.date, cost: r.cost, tags: r.tags });
    });
    state.upgradeRecords.filter(r => r.vehicleId === vehicleId).forEach(r => {
      if (r.tags?.length) records.push({ type: 'Upgrade', description: r.description, date: r.date, cost: r.cost, tags: r.tags });
    });
    state.costs.filter(r => r.vehicleId === vehicleId).forEach(r => {
      if (r.tags?.length) records.push({ type: 'Cost', description: r.name, date: r.startDate, cost: r.amount, tags: r.tags });
    });

    return records;
  }, [state, vehicleId]);

  // Records matching the selected zone's tags
  const filteredRecords = useMemo(() => {
    if (!selectedZone) return [];
    const zoneTags = selectedZone.tags.map(t => t.toLowerCase());
    return allTaggedRecords.filter(r =>
      r.tags.some(t => zoneTags.includes(t.toLowerCase()))
    );
  }, [selectedZone, allTaggedRecords]);

  function updateMapData(newData: VehicleMapData) {
    const updated = state.vehicles.map(v =>
      v.id === vehicleId ? { ...v, mapData: newData } : v
    );
    setState({ ...state, vehicles: updated });
  }

  function handleSaveImageUrl() {
    updateMapData({ ...mapData, imageUrl: imageUrlInput });
  }

  function handleAddZone() {
    if (!newZoneName.trim()) return;
    const tags = newZoneTags.split(',').map(t => t.trim()).filter(Boolean);
    const zone: MapZone = { name: newZoneName.trim(), tags };
    updateMapData({ ...mapData, zones: [...mapData.zones, zone] });
    setNewZoneName('');
    setNewZoneTags('');
  }

  function handleRemoveZone(index: number) {
    const zones = [...mapData.zones];
    if (selectedZone === zones[index]) setSelectedZone(null);
    zones.splice(index, 1);
    updateMapData({ ...mapData, zones });
  }

  return (
    <div className="space-y-6">
      {/* Image Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">{t("vehicle_tab.map.vehicle_image")}</h3>
        <div className="flex gap-3">
          <input
            type="url"
            className={inputCls}
            placeholder={t("vehicle_tab.map.paste_image_url")}
            value={imageUrlInput}
            onChange={e => setImageUrlInput(e.target.value)}
          />
          <button
            onClick={handleSaveImageUrl}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors shrink-0"
          >{t("common.save")}          </button>
        </div>
        {mapData.imageUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-zinc-800">
            <img
              src={mapData.imageUrl}
              alt="Vehicle"
              className="w-full max-h-[400px] object-contain bg-zinc-950"
            />
          </div>
        )}
      </div>

      {/* Zones Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">{t("vehicle_tab.map.map_zones")}</h3>
        <p className="text-xs text-zinc-500 mb-4">
          {t("vehicle_tab.map.zones_description")}
        </p>

        {/* Add Zone Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className={labelCls}>{t("vehicle_tab.map.zone_name")}</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Engine Bay"
              value={newZoneName}
              onChange={e => setNewZoneName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>{t("vehicle_tab.map.tags_comma")}</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. engine, oil, coolant"
              value={newZoneTags}
              onChange={e => setNewZoneTags(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddZone}
              disabled={!newZoneName.trim()}
              className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus size={14} />
              {t("vehicle_tab.map.add_zone")}</button>
          </div>
        </div>

        {/* Zone List */}
        {mapData.zones.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">{t("vehicle_tab.map.no_zones")}</p>
        ) : (
          <div className="space-y-2">
            {mapData.zones.map((zone, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedZone === zone
                    ? 'bg-violet-500/10 border-violet-500/30'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
                onClick={() => setSelectedZone(selectedZone === zone ? null : zone)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Search size={14} className="text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-50">{zone.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {zone.tags.map((tag, ti) => (
                        <span key={ti} className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleRemoveZone(i); }}
                  className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 ml-3"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtered Records */}
      {selectedZone && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">
              {t("vehicle_tab.map.records_for", { name: selectedZone.name })}
            </h3>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          {filteredRecords.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-zinc-500">{t("vehicle_tab.map.no_matching_records", { tags: selectedZone.tags.join(', ') })}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.type")}</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.description")}</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.cost")}</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.tags")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-400">{record.type}</td>
                    <td className="px-4 py-3 text-sm text-zinc-50">{record.description}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{record.date ? formatDate(record.date) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-50 text-right">{formatCurrency(record.cost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {record.tags.map((tag, ti) => (
                          <span key={ti} className="text-xs bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">{tag}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
