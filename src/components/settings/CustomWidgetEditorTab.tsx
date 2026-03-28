import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, Save, X, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import type { CustomWidgetCode } from '../../types';
import CustomWidgetRenderer from '../CustomWidgetRenderer';

export default function CustomWidgetEditorTab() {
  const { t } = useI18n();
  const [widgets, setWidgets] = useState<CustomWidgetCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // widget id or 'new'
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadWidgets = useCallback(async () => {
    try {
      const data = await api.getCustomWidgetCode();
      setWidgets(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const handleAdd = () => {
    setEditing('new');
    setEditName('');
    setEditCode('');
    setShowPreview(false);
  };

  const handleEdit = (widget: CustomWidgetCode) => {
    setEditing(widget.id);
    setEditName(widget.name);
    setEditCode(widget.code);
    setShowPreview(false);
  };

  const handleCancel = () => {
    setEditing(null);
    setEditName('');
    setEditCode('');
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await api.createCustomWidgetCode({ name: editName.trim(), code: editCode });
        setWidgets(prev => [...prev, created]);
      } else if (editing) {
        const updated = await api.updateCustomWidgetCode(editing, { name: editName.trim(), code: editCode });
        setWidgets(prev => prev.map(w => w.id === editing ? updated : w));
      }
      handleCancel();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCustomWidgetCode(id);
      setWidgets(prev => prev.filter(w => w.id !== id));
      if (editing === id) handleCancel();
    } catch {
      // silently fail
    }
  };

  const handleToggleEnabled = async (widget: CustomWidgetCode) => {
    try {
      const updated = await api.updateCustomWidgetCode(widget.id, { enabled: !widget.enabled });
      setWidgets(prev => prev.map(w => w.id === widget.id ? updated : w));
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">{t('custom_widgets.title')}</h2>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-300/90">{t('custom_widgets.warning')}</p>
      </div>

      {/* Editor view */}
      {editing !== null ? (
        <div className="space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('custom_widgets.name')}</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
              placeholder={t('custom_widgets.name')}
            />
          </div>

          {/* Code editor */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('custom_widgets.code')}</label>
            <p className="text-xs text-zinc-600 mb-2">{t('custom_widgets.placeholder_hint')}</p>
            <div className="relative">
              <textarea
                value={editCode}
                onChange={e => setEditCode(e.target.value)}
                className="w-full min-h-[400px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-sm text-emerald-400 placeholder:text-zinc-700 outline-none focus:border-violet-500/50 resize-y"
                placeholder={`<!-- Write your HTML/JavaScript widget code here -->\n<div id='my-widget'>\n  <h3>My Custom Widget</h3>\n  <div id='data-container'></div>\n</div>\n<script>\n  // Fetch data from DriveLedger API\n  fetch('/api/vehicles', {\n    headers: { 'Authorization': 'Bearer ' + window.__DRIVELEDGER_TOKEN__ }\n  })\n  .then(r => r.json())\n  .then(vehicles => {\n    document.getElementById('data-container').innerHTML = \n      vehicles.map(v => '<p>' + v.name + '</p>').join('');\n  });\n</script>`}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('common.save')}
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Eye size={14} />
              {t('custom_widgets.preview')}
            </button>
            <button
              onClick={handleCancel}
              className="text-zinc-500 hover:text-zinc-300 rounded-lg h-10 px-4 text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <X size={14} />
              {t('common.cancel')}
            </button>
          </div>

          {/* Preview */}
          {showPreview && editCode && (
            <div className="mt-4">
              <CustomWidgetRenderer code={editCode} name={editName || 'Preview'} />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Add button */}
          <button
            onClick={handleAdd}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={14} />
            {t('custom_widgets.add')}
          </button>

          {/* Widget list */}
          {widgets.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">
              {t('custom_widgets.no_widgets')}
            </p>
          ) : (
            <div className="space-y-2">
              {widgets.map(w => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-4 py-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-zinc-300 truncate">{w.name}</span>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${
                      w.enabled
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-600'
                    }`}>
                      {w.enabled ? t('custom_widgets.enabled') : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Enable/disable toggle */}
                    <button
                      onClick={() => handleToggleEnabled(w)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors mr-2 ${
                        w.enabled ? 'bg-violet-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          w.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                        style={{ transform: w.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                    <button
                      onClick={() => handleEdit(w)}
                      className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
