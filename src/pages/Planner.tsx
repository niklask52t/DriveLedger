import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ClipboardList, Copy, ArrowRightCircle, Save, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import AttachmentManager from '../components/AttachmentManager';
import { cn } from '../lib/utils';
import { api } from '../api';
import type { AppState, PlannerTask, PlanTemplate, TaskStage, TaskPriority, TaskCategory, Reminder } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
  reminders?: Reminder[];
}

const stages: { key: TaskStage; i18nKey: string }[] = [
  { key: 'planned', i18nKey: 'planner.planned' },
  { key: 'doing', i18nKey: 'planner.doing' },
  { key: 'testing', i18nKey: 'planner.testing' },
  { key: 'done', i18nKey: 'planner.done' },
];

const stageColors: Record<TaskStage, string> = {
  planned: 'border-zinc-600',
  doing: 'border-sky-500',
  testing: 'border-amber-500',
  done: 'border-emerald-500',
};

const stageBgColors: Record<TaskStage, string> = {
  planned: 'bg-zinc-600/10',
  doing: 'bg-sky-500/10',
  testing: 'bg-amber-500/10',
  done: 'bg-emerald-500/10',
};

const priorityConfig: Record<TaskPriority, { i18nKey: string; classes: string }> = {
  critical: { i18nKey: 'planner.priority_critical', classes: 'bg-red-500/10 text-red-400' },
  normal: { i18nKey: 'planner.priority_normal', classes: 'bg-sky-500/10 text-sky-400' },
  low: { i18nKey: 'planner.priority_low', classes: 'bg-zinc-500/10 text-zinc-400' },
};

const categoryConfig: Record<TaskCategory, { i18nKey: string; classes: string }> = {
  service: { i18nKey: 'planner.category_service', classes: 'bg-violet-500/10 text-violet-400' },
  repair: { i18nKey: 'planner.category_repair', classes: 'bg-amber-500/10 text-amber-400' },
  upgrade: { i18nKey: 'planner.category_upgrade', classes: 'bg-emerald-500/10 text-emerald-400' },
};

const targetTypeConfig: Record<string, { i18nKey: string; classes: string }> = {
  service: { i18nKey: 'planner.category_service', classes: 'bg-violet-500/10 text-violet-400' },
  repair: { i18nKey: 'planner.category_repair', classes: 'bg-amber-500/10 text-amber-400' },
  upgrade: { i18nKey: 'planner.category_upgrade', classes: 'bg-emerald-500/10 text-emerald-400' },
};

const emptyForm = {
  vehicleId: '' as string | null,
  title: '',
  description: '',
  priority: 'normal' as TaskPriority,
  stage: 'planned' as TaskStage,
  category: 'service' as TaskCategory,
  targetType: 'service' as string,
  estimatedCost: 0,
  notes: '',
  reminderRecordId: '' as string,
};

export default function Planner({ state, setState, reminders = [] }: Props) {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlannerTask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterVehicle, setFilterVehicle] = useState('');

  // Templates
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [templateVehicleModalOpen, setTemplateVehicleModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateVehicleId, setTemplateVehicleId] = useState('');
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Convert
  const [convertingTask, setConvertingTask] = useState<PlannerTask | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.getPlanTemplates().then(setTemplates).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    let items = [...state.plannerTasks];
    if (filterVehicle) items = items.filter(t => t.vehicleId === filterVehicle);
    return items;
  }, [state.plannerTasks, filterVehicle]);

  const tasksByStage = useMemo(() => {
    const map: Record<TaskStage, PlannerTask[]> = {
      planned: [], doing: [], testing: [], done: [],
    };
    for (const task of filtered) {
      map[task.stage].push(task);
    }
    return map;
  }, [filtered]);

  const getVehicleName = (id: string | null) => {
    if (!id) return '';
    return state.vehicles.find(v => v.id === id)?.name || '-';
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (task: PlannerTask) => {
    setEditing(task);
    setForm({
      vehicleId: task.vehicleId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      stage: task.stage,
      category: task.category,
      targetType: task.targetType || task.category || 'service',
      estimatedCost: task.estimatedCost || 0,
      notes: task.notes,
      reminderRecordId: task.reminderRecordId || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      vehicleId: form.vehicleId || null,
      title: form.title,
      description: form.description,
      priority: form.priority,
      stage: form.stage,
      category: form.category,
      targetType: form.targetType,
      estimatedCost: form.estimatedCost,
      notes: form.notes,
      reminderRecordId: form.reminderRecordId || null,
    };
    try {
      if (editing) {
        const updated = await api.updatePlannerTask(editing.id, payload);
        setState({ ...state, plannerTasks: state.plannerTasks.map(t => t.id === editing.id ? updated : t) });
      } else {
        const created = await api.createPlannerTask(payload);
        setState({ ...state, plannerTasks: [...state.plannerTasks, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save planner task', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePlannerTask(id);
      setState({ ...state, plannerTasks: state.plannerTasks.filter(t => t.id !== id) });
    } catch (e) {
      console.error('Failed to delete planner task', e);
    }
  };

  const moveStage = async (task: PlannerTask, direction: 'left' | 'right') => {
    const stageKeys: TaskStage[] = ['planned', 'doing', 'testing', 'done'];
    const idx = stageKeys.indexOf(task.stage);
    const newIdx = direction === 'right' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= stageKeys.length) return;
    const newStage = stageKeys[newIdx];
    try {
      const updated = await api.updateTaskStage(task.id, newStage);
      setState({ ...state, plannerTasks: state.plannerTasks.map(t => t.id === task.id ? updated : t) });
    } catch (e) {
      console.error('Failed to update task stage', e);
    }
  };

  // Template: open vehicle selector for creating from template
  const handleFromTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateVehicleId(state.vehicles[0]?.id || '');
    setTemplateVehicleModalOpen(true);
    setTemplateDropdownOpen(false);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      const created = await api.createTaskFromTemplate(selectedTemplateId, templateVehicleId);
      setState({ ...state, plannerTasks: [...state.plannerTasks, created] });
      setTemplateVehicleModalOpen(false);
      setSelectedTemplateId(null);
    } catch (e) {
      console.error('Failed to create task from template', e);
    }
  };

  // Save as template
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !editing) return;
    try {
      const created = await api.createPlanTemplate({
        name: templateName,
        description: editing.description,
        targetType: form.targetType || editing.category || 'service',
        priority: editing.priority,
        estimatedCost: form.estimatedCost || 0,
      });
      setTemplates([created, ...templates]);
      setSaveTemplateModalOpen(false);
      setTemplateName('');
    } catch (e) {
      console.error('Failed to save template', e);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.deletePlanTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (e) {
      console.error('Failed to delete template', e);
    }
  };

  // Convert to record
  const handleConvert = async (task: PlannerTask) => {
    try {
      const result = await api.convertPlanToRecord(task.id, task.targetType || task.category);
      setState({ ...state, plannerTasks: state.plannerTasks.filter(t => t.id !== task.id) });
      setConvertSuccess(`Task converted to ${result.recordType} record`);
      setTimeout(() => setConvertSuccess(null), 3000);
    } catch (e: any) {
      console.error('Failed to convert task', e);
      alert(e.message || 'Failed to convert task. Make sure a vehicle is assigned.');
    }
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  return (
    <div className="space-y-8">
      {/* Success toast */}
      {convertSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg">
          {convertSuccess}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={filterVehicle}
            onChange={e => setFilterVehicle(e.target.value)}
            className="h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none min-w-[180px]"
            style={{ background: chevronBg }}
          >
            <option value="">{t('planner.all_vehicles')}</option>
            {state.vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {/* From Template dropdown */}
          <div className="relative">
            <button
              onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm font-medium inline-flex items-center gap-2"
            >
              <Copy size={16} />
              {t('planner.from_template')}
              <ChevronDown size={14} />
            </button>
            {templateDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setTemplateDropdownOpen(false)} />
                <div className="absolute right-0 mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 py-1 max-h-64 overflow-y-auto">
                  {templates.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-zinc-500">{t('planner.no_templates')}</div>
                  ) : (
                    templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors">
                        <button
                          onClick={() => handleFromTemplate(t.id)}
                          className="flex-1 text-left text-sm text-zinc-50 truncate"
                        >
                          {t.name}
                          <span className="ml-2 text-xs text-zinc-500">{t.targetType}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                          className="text-zinc-500 hover:text-red-400 ml-2 shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
            <Plus size={16} />
            {t('planner.add')}
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stages.map(stage => {
          const tasks = tasksByStage[stage.key];
          return (
            <div key={stage.key} className="flex flex-col min-h-[300px]">
              {/* Column Header */}
              <div className={cn('rounded-t-xl border-t-2 px-4 py-3 bg-zinc-900 border-x border-b border-zinc-800', stageColors[stage.key])}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-50">{t(stage.i18nKey)}</h3>
                  <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium', stageBgColors[stage.key], 'text-zinc-300')}>
                    {tasks.length}
                  </span>
                </div>
              </div>

              {/* Task List */}
              <div className="flex-1 bg-zinc-950/30 border-x border-b border-zinc-800 rounded-b-xl p-3 space-y-3">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                    <ClipboardList size={24} className="mb-2" />
                    <p className="text-xs">{t('planner.no_tasks_column')}</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 hover:border-zinc-700 transition-colors cursor-pointer group"
                      onClick={() => openEdit(task)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-zinc-50 flex-1 min-w-0 truncate pr-2">{task.title}</h4>
                      </div>

                      {task.vehicleId && (
                        <p className="text-xs text-zinc-500 mb-2">{getVehicleName(task.vehicleId)}</p>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', priorityConfig[task.priority].classes)}>
                          {t(priorityConfig[task.priority].i18nKey)}
                        </span>
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', categoryConfig[task.category].classes)}>
                          {t(categoryConfig[task.category].i18nKey)}
                        </span>
                        {task.targetType && task.targetType !== task.category && targetTypeConfig[task.targetType] && (
                          <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', targetTypeConfig[task.targetType].classes)}>
                            {t(targetTypeConfig[task.targetType].i18nKey)}
                          </span>
                        )}
                        {task.estimatedCost && task.estimatedCost > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-zinc-700/30 text-zinc-400">
                            ~{task.estimatedCost.toFixed(0)} EUR
                          </span>
                        ) : null}
                      </div>

                      {/* Stage move buttons + convert */}
                      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          {stage.key !== 'planned' && (
                            <button
                              onClick={e => { e.stopPropagation(); moveStage(task, 'left'); }}
                              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded h-7 w-7 inline-flex items-center justify-center"
                              title={t('planner.move_left')}
                            >
                              <ChevronLeft size={14} />
                            </button>
                          )}
                          {stage.key !== 'done' && (
                            <button
                              onClick={e => { e.stopPropagation(); moveStage(task, 'right'); }}
                              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded h-7 w-7 inline-flex items-center justify-center"
                              title={t('planner.move_right')}
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {stage.key === 'done' && task.vehicleId && (
                            <button
                              onClick={e => { e.stopPropagation(); handleConvert(task); }}
                              className="text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800 rounded h-7 px-2 inline-flex items-center justify-center gap-1 text-xs"
                              title={t('planner.convert_to_record')}
                            >
                              <ArrowRightCircle size={12} />
                              {t('planner.convert')}
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                            className="text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded h-7 w-7 inline-flex items-center justify-center"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('planner.edit') : t('planner.add')}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {editing && (
                <button
                  onClick={() => {
                    setTemplateName(editing.title);
                    setSaveTemplateModalOpen(true);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2"
                >
                  <Save size={14} />
                  {t('planner.save_as_template')}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
                {editing ? t('common.save_changes') : t('planner.add')}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Replace brake pads"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.description')}</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Task details..."
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.vehicle_optional')}</label>
            <select
              value={form.vehicleId || ''}
              onChange={e => setForm({ ...form, vehicleId: e.target.value || null })}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('common.no_vehicle')}</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.priority')}</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="low">{t('planner.priority_low')}</option>
                <option value="normal">{t('planner.priority_normal')}</option>
                <option value="critical">{t('planner.priority_critical')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.stage')}</label>
              <select
                value={form.stage}
                onChange={e => setForm({ ...form, stage: e.target.value as TaskStage })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                {stages.map(s => (
                  <option key={s.key} value={s.key}>{t(s.i18nKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.category')}</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value as TaskCategory })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="service">{t('planner.category_service')}</option>
                <option value="repair">{t('planner.category_repair')}</option>
                <option value="upgrade">{t('planner.category_upgrade')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.target_type_label')}</label>
              <select
                value={form.targetType}
                onChange={e => setForm({ ...form, targetType: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="service">{t('planner.category_service')}</option>
                <option value="repair">{t('planner.category_repair')}</option>
                <option value="upgrade">{t('planner.category_upgrade')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.estimated_cost')}</label>
              <input
                type="number"
                step="0.01"
                value={form.estimatedCost || ''}
                onChange={e => setForm({ ...form, estimatedCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputClasses}
              />
            </div>
          </div>

          {reminders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.linked_reminder')}</label>
              <select
                value={form.reminderRecordId}
                onChange={e => setForm({ ...form, reminderRecordId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">{t('planner.no_reminder')}</option>
                {reminders.filter(r => r.active).map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
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

          {editing && (
            <AttachmentManager recordType="planner" recordId={editing.id} />
          )}
        </div>
      </Modal>

      {/* Vehicle selector for creating from template */}
      <Modal
        isOpen={templateVehicleModalOpen}
        onClose={() => setTemplateVehicleModalOpen(false)}
        title={t('planner.create_from_template')}
        size="md"
        footer={
          <>
            <button onClick={() => setTemplateVehicleModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleCreateFromTemplate} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {t('planner.create_task')}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.assign_vehicle')}</label>
          <select
            value={templateVehicleId}
            onChange={e => setTemplateVehicleId(e.target.value)}
            className={selectClasses}
            style={{ background: chevronBg }}
          >
            <option value="">{t('common.no_vehicle')}</option>
            {state.vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Save as Template modal */}
      <Modal
        isOpen={saveTemplateModalOpen}
        onClose={() => setSaveTemplateModalOpen(false)}
        title={t('planner.save_as_template')}
        size="md"
        footer={
          <>
            <button onClick={() => setSaveTemplateModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSaveAsTemplate} disabled={!templateName.trim()} className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {t('planner.save_template')}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">{t('planner.template_name')}</label>
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="e.g. Annual Oil Change"
            className={inputClasses}
          />
        </div>
      </Modal>
    </div>
  );
}
