import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { api } from '../api';
import type { AppState, PlannerTask, TaskStage, TaskPriority, TaskCategory } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const stages: { key: TaskStage; label: string }[] = [
  { key: 'planned', label: 'Planned' },
  { key: 'doing', label: 'Doing' },
  { key: 'testing', label: 'Testing' },
  { key: 'done', label: 'Done' },
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

const priorityConfig: Record<TaskPriority, { label: string; classes: string }> = {
  critical: { label: 'Critical', classes: 'bg-red-500/10 text-red-400' },
  normal: { label: 'Normal', classes: 'bg-sky-500/10 text-sky-400' },
  low: { label: 'Low', classes: 'bg-zinc-500/10 text-zinc-400' },
};

const categoryConfig: Record<TaskCategory, { label: string; classes: string }> = {
  service: { label: 'Service', classes: 'bg-violet-500/10 text-violet-400' },
  repair: { label: 'Repair', classes: 'bg-amber-500/10 text-amber-400' },
  upgrade: { label: 'Upgrade', classes: 'bg-emerald-500/10 text-emerald-400' },
};

const emptyForm = {
  vehicleId: '' as string | null,
  title: '',
  description: '',
  priority: 'normal' as TaskPriority,
  stage: 'planned' as TaskStage,
  category: 'service' as TaskCategory,
  notes: '',
};

export default function Planner({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlannerTask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterVehicle, setFilterVehicle] = useState('');

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
      notes: task.notes,
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
      notes: form.notes,
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

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={filterVehicle}
            onChange={e => setFilterVehicle(e.target.value)}
            className="h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none min-w-[180px]"
            style={{ background: chevronBg }}
          >
            <option value="">All Vehicles</option>
            {state.vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          Add Task
        </button>
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
                  <h3 className="text-sm font-medium text-zinc-50">{stage.label}</h3>
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
                    <p className="text-xs">No tasks</p>
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

                      <div className="flex items-center gap-1.5 mb-3">
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', priorityConfig[task.priority].classes)}>
                          {priorityConfig[task.priority].label}
                        </span>
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', categoryConfig[task.category].classes)}>
                          {categoryConfig[task.category].label}
                        </span>
                      </div>

                      {/* Stage move buttons */}
                      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          {stage.key !== 'planned' && (
                            <button
                              onClick={e => { e.stopPropagation(); moveStage(task, 'left'); }}
                              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded h-7 w-7 inline-flex items-center justify-center"
                              title="Move left"
                            >
                              <ChevronLeft size={14} />
                            </button>
                          )}
                          {stage.key !== 'done' && (
                            <button
                              onClick={e => { e.stopPropagation(); moveStage(task, 'right'); }}
                              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded h-7 w-7 inline-flex items-center justify-center"
                              title="Move right"
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                          className="text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded h-7 w-7 inline-flex items-center justify-center"
                        >
                          <Trash2 size={12} />
                        </button>
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
        title={editing ? 'Edit Task' : 'Add Task'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Task'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Replace brake pads"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Task details..."
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle (optional)</label>
            <select
              value={form.vehicleId || ''}
              onChange={e => setForm({ ...form, vehicleId: e.target.value || null })}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">No vehicle</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm({ ...form, stage: e.target.value as TaskStage })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                {stages.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value as TaskCategory })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="service">Service</option>
                <option value="repair">Repair</option>
                <option value="upgrade">Upgrade</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
