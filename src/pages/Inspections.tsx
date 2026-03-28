import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, MinusCircle, Save, FileText } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate } from '../utils';
import { api } from '../api';
import { useI18n } from '../contexts/I18nContext';
import type {
  AppState, Inspection, InspectionItem, InspectionResult,
  InspectionTemplate, InspectionField, InspectionFieldOption,
  InspectionResultEntry,
} from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyItem: InspectionItem = { name: '', result: 'pass', notes: '' };

const emptyForm = {
  vehicleId: '',
  date: '',
  title: '',
  mileage: 0,
  cost: 0,
  notes: '',
  items: [{ ...emptyItem }] as InspectionItem[],
};

function computeOverallResult(items: InspectionItem[]): string {
  if (items.length === 0) return 'pass';
  return items.some(i => i.result === 'fail') ? 'fail' : 'pass';
}

/** Deep-clone template fields with isSelected defaults */
function cloneFieldsWithSelection(fields: InspectionField[]): InspectionField[] {
  return fields.map(f => ({
    ...f,
    options: f.options.map(o => ({ ...o, isSelected: false })),
  }));
}

/** For a single field, determine if it passed based on current selections */
function fieldPassed(field: InspectionField & { options: (InspectionFieldOption & { isSelected?: boolean })[] }): boolean {
  if (field.fieldType === 'text') return true;
  if (field.fieldType === 'radio') {
    // Fail if any selected option is marked isFail
    return !field.options.some(o => (o as any).isSelected && o.isFail);
  }
  if (field.fieldType === 'check') {
    // Fail if any isFail option is NOT selected (i.e. required check was missed)
    return !field.options.some(o => o.isFail && !(o as any).isSelected);
  }
  return true;
}

/** Compute overall failed status from template fields */
function computeTemplateFailed(fields: any[]): boolean {
  if (!fields || fields.length === 0) return false;
  return fields.some(f => !fieldPassed(f));
}

/** Build InspectionResultEntry[] from template fields for saving */
function buildResultEntries(fields: any[]): InspectionResultEntry[] {
  return fields.map(f => ({
    fieldDescription: f.description,
    fieldType: f.fieldType,
    value: f.fieldType === 'text' ? (f.textValue || '') : '',
    selectedOptions: f.options
      .filter((o: any) => o.isSelected)
      .map((o: any) => o.description),
    passed: fieldPassed(f),
    hasActionItem: f.hasActionItem || false,
    actionItemType: f.actionItemType || 'repair',
    actionItemDescription: f.actionItemDescription || f.description,
    actionItemPriority: f.actionItemPriority || 'normal',
  }));
}

export default function Inspections({ state, setState }: Props) {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inspection | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterVehicle, setFilterVehicle] = useState('');

  // Template state
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateFields, setTemplateFields] = useState<any[]>([]);
  const [useTemplate, setUseTemplate] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Load templates on mount
  useEffect(() => {
    api.getInspectionTemplates().then(setTemplates).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    let items = [...state.inspections];
    if (filterVehicle) items = items.filter(r => r.vehicleId === filterVehicle);
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [state.inspections, filterVehicle]);

  const totalInspections = filtered.length;
  const passCount = filtered.filter(i => !i.failed && i.overallResult === 'pass').length;
  const passRate = totalInspections > 0 ? Math.round((passCount / totalInspections) * 100) : 0;
  const lastInspection = filtered.length > 0 ? filtered[0].date : null;

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const resetTemplateState = useCallback(() => {
    setSelectedTemplateId('');
    setTemplateFields([]);
    setUseTemplate(false);
    setShowSaveTemplate(false);
    setSaveTemplateName('');
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      vehicleId: state.vehicles[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      items: [{ ...emptyItem }],
    });
    resetTemplateState();
    setModalOpen(true);
  };

  const openEdit = (inspection: Inspection) => {
    setEditing(inspection);
    setForm({
      vehicleId: inspection.vehicleId,
      date: inspection.date,
      title: inspection.title,
      mileage: inspection.mileage,
      cost: inspection.cost,
      notes: inspection.notes,
      items: inspection.items && inspection.items.length > 0 ? inspection.items.map(i => ({ ...i })) : [{ ...emptyItem }],
    });

    // If the inspection has template results, restore template fields
    if (inspection.templateName && inspection.results && inspection.results.length > 0) {
      const matchingTemplate = templates.find(t => t.name === inspection.templateName);
      if (matchingTemplate) {
        const fields = cloneFieldsWithSelection(matchingTemplate.fields);
        // Restore selections from saved results
        inspection.results.forEach((result, idx) => {
          if (idx < fields.length) {
            const field = fields[idx] as any;
            if (result.fieldType === 'text') {
              field.textValue = result.value || '';
            } else {
              field.options.forEach((opt: any) => {
                opt.isSelected = result.selectedOptions.includes(opt.description);
              });
            }
          }
        });
        setTemplateFields(fields);
        setSelectedTemplateId(matchingTemplate.id);
        setUseTemplate(true);
      } else {
        // Template was deleted but results exist - reconstruct fields from results
        const fields = inspection.results.map(r => ({
          description: r.fieldDescription,
          fieldType: r.fieldType,
          textValue: r.fieldType === 'text' ? r.value : undefined,
          options: r.fieldType === 'text' ? [] : r.selectedOptions.map(desc => ({
            description: desc,
            isFail: !r.passed,
            isSelected: true,
          })),
        }));
        setTemplateFields(fields);
        setSelectedTemplateId('');
        setUseTemplate(true);
      }
    } else {
      resetTemplateState();
    }

    setModalOpen(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setTemplateFields([]);
      setUseTemplate(false);
      return;
    }
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      const fields = cloneFieldsWithSelection(tpl.fields);
      // Add textValue for text fields
      fields.forEach((f: any) => {
        if (f.fieldType === 'text') f.textValue = '';
      });
      setTemplateFields(fields);
      setUseTemplate(true);
      // Auto-fill title from template name if empty
      if (!form.title.trim()) {
        setForm(prev => ({ ...prev, title: tpl.name }));
      }
    }
  };

  const updateFieldOption = (fieldIdx: number, optIdx: number, selected: boolean) => {
    setTemplateFields(prev => {
      const updated = [...prev];
      const field = { ...updated[fieldIdx] };
      const options = [...field.options];

      if (field.fieldType === 'radio') {
        // Radio: only one selected at a time
        options.forEach((o: any, i: number) => {
          options[i] = { ...o, isSelected: i === optIdx ? selected : false };
        });
      } else {
        // Check: toggle individual
        options[optIdx] = { ...options[optIdx], isSelected: selected };
      }

      field.options = options;
      updated[fieldIdx] = field;
      return updated;
    });
  };

  const updateFieldTextValue = (fieldIdx: number, value: string) => {
    setTemplateFields(prev => {
      const updated = [...prev];
      updated[fieldIdx] = { ...updated[fieldIdx], textValue: value };
      return updated;
    });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: keyof InspectionItem, value: string) => {
    const updated = form.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setForm({ ...form, items: updated });
  };

  const handleSave = async () => {
    if (!form.vehicleId || !form.title.trim()) return;
    const validItems = form.items.filter(i => i.name.trim());
    const overallResult = computeOverallResult(validItems);

    const payload: any = {
      vehicleId: form.vehicleId,
      date: form.date,
      title: form.title,
      mileage: form.mileage,
      cost: form.cost,
      notes: form.notes,
      items: validItems,
      overallResult,
    };

    // Include template data if using a template
    if (useTemplate && templateFields.length > 0) {
      const results = buildResultEntries(templateFields);
      const failed = computeTemplateFailed(templateFields);
      const tpl = templates.find(t => t.id === selectedTemplateId);
      payload.templateName = tpl?.name || form.title;
      payload.results = results;
      // Override overallResult based on template pass/fail
      payload.overallResult = failed ? 'fail' : 'pass';
    }

    try {
      if (editing) {
        const updated = await api.updateInspection(editing.id, payload);
        setState({ ...state, inspections: state.inspections.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createInspection(payload);
        setState({ ...state, inspections: [...state.inspections, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save inspection', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteInspection(id);
      setState({ ...state, inspections: state.inspections.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete inspection', e);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!saveTemplateName.trim() || templateFields.length === 0) return;
    // Strip runtime state (isSelected, textValue) to save clean fields
    const cleanFields: InspectionField[] = templateFields.map(f => ({
      description: f.description,
      fieldType: f.fieldType,
      options: f.options.map((o: any) => ({
        description: o.description,
        isFail: o.isFail,
      })),
      hasActionItem: f.hasActionItem || false,
      actionItemType: f.actionItemType || 'repair',
      actionItemDescription: f.actionItemDescription || '',
      actionItemPriority: f.actionItemPriority || 'normal',
    }));
    try {
      const created = await api.createInspectionTemplate({ name: saveTemplateName.trim(), fields: cleanFields });
      setTemplates(prev => [...prev, created]);
      setShowSaveTemplate(false);
      setSaveTemplateName('');
    } catch (e) {
      console.error('Failed to save template', e);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.deleteInspectionTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedTemplateId === id) {
        setSelectedTemplateId('');
        setTemplateFields([]);
        setUseTemplate(false);
      }
    } catch (e) {
      console.error('Failed to delete template', e);
    }
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  const ResultBadge = ({ result, failed }: { result: string; failed?: boolean }) => {
    // If template-based failed flag is set, use it
    const isFail = failed === true || result === 'fail';
    const isPass = failed === false ? result !== 'fail' : result === 'pass';
    if (isFail) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium"><XCircle size={12} /> {t('inspections.failed')}</span>;
    if (isPass) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle2 size={12} /> {t('inspections.passed')}</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium"><MinusCircle size={12} /> {t('inspections.na')}</span>;
  };

  const templateFailed = useTemplate && templateFields.length > 0 ? computeTemplateFailed(templateFields) : false;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{t('inspections.subtitle')}</p>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          {t('inspections.add')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: t('inspections.total_inspections'), value: String(totalInspections), color: 'text-violet-400' },
          { label: t('inspections.pass_rate'), value: `${passRate}%`, color: passRate >= 80 ? 'text-emerald-400' : 'text-amber-400' },
          { label: t('inspections.last_inspection'), value: lastInspection ? formatDate(lastInspection) : '-', color: 'text-sky-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
            <select
              value={filterVehicle}
              onChange={e => setFilterVehicle(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('costs.all_vehicles')}</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.date')}</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.vehicle')}</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.title')}</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('inspections.result')}</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('inspections.template')}</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('inspections.items')}</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('common.cost')}</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    {t('inspections.no_inspections_table')}
                  </td>
                </tr>
              ) : (
                filtered.map(inspection => (
                  <motion.tr
                    key={inspection.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(inspection.date)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(inspection.vehicleId)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">{inspection.title}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <ResultBadge result={inspection.overallResult} failed={inspection.failed} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 text-center">
                      {inspection.templateName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-xs">
                          <FileText size={10} /> {inspection.templateName}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 text-center">{inspection.items?.length || 0}</td>
                    <td className="px-4 py-3.5 text-sm text-red-400 font-medium text-center">{formatCurrency(inspection.cost)}</td>
                    <td className="px-4 py-3.5 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(inspection)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(inspection.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('inspections.edit') : t('inspections.add')}
        size="2xl"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? t('common.save_changes') : t('inspections.add')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Use Template dropdown */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-400">{t('inspections.use_template')}</label>
              {templates.length > 0 && selectedTemplateId && (
                <button
                  onClick={() => handleDeleteTemplate(selectedTemplateId)}
                  className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                >
                  <Trash2 size={12} /> {t('inspections.delete_template')}
                </button>
              )}
            </div>
            <select
              value={selectedTemplateId}
              onChange={e => handleSelectTemplate(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('inspections.no_template')}</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.fields.length} fields)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
              <select
                value={form.vehicleId}
                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">{t('common.select_vehicle')}</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.date')}</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Annual TUV Inspection"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inspections.mileage_label')}</label>
              <input
                type="number"
                value={form.mileage || ''}
                onChange={e => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.cost')}</label>
              <input
                type="number"
                step="0.01"
                value={form.cost || ''}
                onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputClasses}
              />
            </div>
          </div>

          {/* Template Fields (when template is selected) */}
          {useTemplate && templateFields.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-zinc-400">{t('inspections.template_fields')}</label>
                <div className="flex items-center gap-2">
                  {templateFailed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                      <XCircle size={12} /> {t('inspections.failed')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                      <CheckCircle2 size={12} /> {t('inspections.passed')}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {templateFields.map((field, fIdx) => (
                  <div key={fIdx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-zinc-200">{field.description}</p>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        field.fieldType === 'radio' ? 'bg-sky-500/10 text-sky-400' :
                        field.fieldType === 'check' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-zinc-500/10 text-zinc-400'
                      )}>
                        {field.fieldType}
                      </span>
                    </div>

                    {field.fieldType === 'radio' && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {field.options.map((opt: any, oIdx: number) => (
                          <label
                            key={oIdx}
                            className={cn(
                              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                              opt.isSelected
                                ? opt.isFail
                                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                  : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                            )}
                          >
                            <input
                              type="radio"
                              name={`template-field-${fIdx}`}
                              checked={opt.isSelected || false}
                              onChange={() => updateFieldOption(fIdx, oIdx, true)}
                              className="sr-only"
                            />
                            <span className={cn(
                              'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                              opt.isSelected ? 'border-current' : 'border-zinc-600'
                            )}>
                              {opt.isSelected && <span className="w-2 h-2 rounded-full bg-current" />}
                            </span>
                            {opt.description}
                            {opt.isFail && <span className="text-[10px] text-red-500">(fail)</span>}
                          </label>
                        ))}
                      </div>
                    )}

                    {field.fieldType === 'check' && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {field.options.map((opt: any, oIdx: number) => (
                          <label
                            key={oIdx}
                            className={cn(
                              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                              opt.isSelected
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                : opt.isFail
                                  ? 'border-red-500/30 bg-red-500/5 text-red-400'
                                  : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={opt.isSelected || false}
                              onChange={e => updateFieldOption(fIdx, oIdx, e.target.checked)}
                              className="sr-only"
                            />
                            <span className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center',
                              opt.isSelected ? 'border-emerald-400 bg-emerald-500/20' : 'border-zinc-600'
                            )}>
                              {opt.isSelected && <CheckCircle2 size={10} className="text-emerald-400" />}
                            </span>
                            {opt.description}
                            {opt.isFail && !opt.isSelected && <span className="text-[10px] text-red-500">(required)</span>}
                          </label>
                        ))}
                      </div>
                    )}

                    {field.fieldType === 'text' && (
                      <textarea
                        value={field.textValue || ''}
                        onChange={e => updateFieldTextValue(fIdx, e.target.value)}
                        placeholder={t('inspections.enter_notes')}
                        className="w-full min-h-[60px] bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none mt-2"
                      />
                    )}

                    {/* Per-field pass/fail indicator */}
                    {field.fieldType !== 'text' && (
                      <div className="mt-2 text-xs">
                        {fieldPassed(field) ? (
                          <span className="text-emerald-500">{t('inspections.pass')}</span>
                        ) : (
                          <span className="text-red-500">{t('inspections.fail')}</span>
                        )}
                      </div>
                    )}

                    {/* Action Item on Fail toggle */}
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-zinc-400">
                        <input
                          type="checkbox"
                          checked={field.hasActionItem || false}
                          onChange={e => {
                            setTemplateFields(prev => {
                              const updated = [...prev];
                              updated[fIdx] = { ...updated[fIdx], hasActionItem: e.target.checked };
                              return updated;
                            });
                          }}
                          className="rounded border-zinc-700 bg-zinc-800"
                        />
                        {t('inspections.create_action_item_on_fail')}
                      </label>
                      {field.hasActionItem && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">{t('inspections.action_item_type')}</label>
                            <select
                              value={field.actionItemType || 'repair'}
                              onChange={e => {
                                setTemplateFields(prev => {
                                  const updated = [...prev];
                                  updated[fIdx] = { ...updated[fIdx], actionItemType: e.target.value };
                                  return updated;
                                });
                              }}
                              className={selectClasses}
                              style={{ background: chevronBg }}
                            >
                              <option value="service">{t('inspections.action_type_service')}</option>
                              <option value="repair">{t('inspections.action_type_repair')}</option>
                              <option value="upgrade">{t('inspections.action_type_upgrade')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">{t('inspections.action_item_priority')}</label>
                            <select
                              value={field.actionItemPriority || 'normal'}
                              onChange={e => {
                                setTemplateFields(prev => {
                                  const updated = [...prev];
                                  updated[fIdx] = { ...updated[fIdx], actionItemPriority: e.target.value };
                                  return updated;
                                });
                              }}
                              className={selectClasses}
                              style={{ background: chevronBg }}
                            >
                              <option value="critical">{t('inspections.priority_critical')}</option>
                              <option value="normal">{t('inspections.priority_normal')}</option>
                              <option value="low">{t('inspections.priority_low')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">{t('inspections.action_item_description')}</label>
                            <input
                              type="text"
                              value={field.actionItemDescription || ''}
                              onChange={e => {
                                setTemplateFields(prev => {
                                  const updated = [...prev];
                                  updated[fIdx] = { ...updated[fIdx], actionItemDescription: e.target.value };
                                  return updated;
                                });
                              }}
                              placeholder={field.description}
                              className={inputClasses}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save as Template button */}
              <div className="mt-4">
                {!showSaveTemplate ? (
                  <button
                    onClick={() => setShowSaveTemplate(true)}
                    className="text-sm text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
                  >
                    <Save size={14} /> {t('inspections.save_as_template')}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveTemplateName}
                      onChange={e => setSaveTemplateName(e.target.value)}
                      placeholder={t('inspections.template_name_placeholder')}
                      className={inputClasses}
                    />
                    <button
                      onClick={handleSaveAsTemplate}
                      disabled={!saveTemplateName.trim()}
                      className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white rounded-lg h-10 px-4 text-sm font-medium whitespace-nowrap"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      onClick={() => { setShowSaveTemplate(false); setSaveTemplateName(''); }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-3 text-sm"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Inspection Items (when no template) */}
          {!useTemplate && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-zinc-400">{t('inspections.inspection_items')}</label>
                <button
                  onClick={addItem}
                  className="text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
                >
                  <Plus size={14} />
                  {t('inspections.add_item')}
                </button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        placeholder={t('inspections.item_name')}
                        className={inputClasses}
                      />
                    </div>
                    <div className="w-28">
                      <select
                        value={item.result}
                        onChange={e => updateItem(idx, 'result', e.target.value)}
                        className={selectClasses}
                        style={{ background: chevronBg }}
                      >
                        <option value="pass">{t('inspections.pass')}</option>
                        <option value="fail">{t('inspections.fail')}</option>
                        <option value="na">{t('inspections.na')}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={e => updateItem(idx, 'notes', e.target.value)}
                        placeholder={t('common.notes')}
                        className={inputClasses}
                      />
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-zinc-500 hover:text-red-400 h-10 px-2 inline-flex items-center"
                      disabled={form.items.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {/* Auto-calculated result preview */}
              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
                {t('inspections.overall_result')} <ResultBadge result={computeOverallResult(form.items.filter(i => i.name.trim()))} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder={t('common.optional_notes')}
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
