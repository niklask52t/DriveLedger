import { useState, useEffect, useRef } from 'react';
import { Paperclip, Link, GitBranch, Trash2, Upload, Plus, ExternalLink, FileText, Pencil, Check, X, Image, FileDown, Maximize2 } from 'lucide-react';
import { api } from '../api';
import type { Attachment } from '../types';

function isImageFile(fileName: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName);
}

function isPdfFile(fileName: string): boolean {
  return /\.pdf$/i.test(fileName);
}

function getDownloadUrl(att: Attachment): string {
  return `/api/attachments/${att.id}/download`;
}

interface Props {
  recordType: string;
  recordId: string;
}

const RECORD_TYPES = [
  { key: 'services', label: 'Services' },
  { key: 'repairs', label: 'Repairs' },
  { key: 'upgrades', label: 'Upgrades' },
  { key: 'fuel', label: 'Fuel Records' },
  { key: 'costs', label: 'Costs' },
  { key: 'taxes', label: 'Taxes' },
  { key: 'supplies', label: 'Supplies' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'notes', label: 'Notes' },
  { key: 'planner', label: 'Planner' },
];

const MAX_IMAGE_WIDTH = 800;

function getAttachmentType(att: Attachment): 'file' | 'link' | 'reference' {
  if (att.filePath?.startsWith('http')) return 'link';
  if (att.filePath?.startsWith('::')) return 'reference';
  return 'file';
}

function parseReference(filePath: string): { refType: string; refId: string } | null {
  if (!filePath.startsWith('::')) return null;
  const parts = filePath.slice(2).split(':');
  if (parts.length >= 2) return { refType: parts[0], refId: parts[1] };
  return null;
}

/** Resize an image file to max width using canvas, returns resized File */
function resizeImage(file: File, maxWidth: number): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width <= maxWidth) {
        resolve(file);
        return;
      }

      const ratio = maxWidth / img.width;
      const newWidth = maxWidth;
      const newHeight = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const resizedFile = new File([blob], file.name, { type: file.type, lastModified: Date.now() });
          resolve(resizedFile);
        },
        file.type,
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export default function AttachmentManager({ recordType, recordId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showRefForm, setShowRefForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [refRecordType, setRefRecordType] = useState('');
  const [refRecordId, setRefRecordId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedPreview, setExpandedPreview] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      const data = await api.getAttachments(recordType, recordId);
      setAttachments(data);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) fetchAttachments();
  }, [recordType, recordId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Resize images before upload (Gap #4)
      const processedFile = await resizeImage(file, MAX_IMAGE_WIDTH);
      await api.uploadAttachment(recordType, recordId, processedFile);
      await fetchAttachments();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl) return;
    try {
      await api.addLinkAttachment(recordType, recordId, linkUrl, linkName || undefined);
      setLinkUrl('');
      setLinkName('');
      setShowLinkForm(false);
      await fetchAttachments();
    } catch (err) {
      console.error('Add link failed:', err);
    }
  };

  const handleAddReference = async () => {
    if (!refRecordType || !refRecordId) return;
    try {
      await api.addReferenceAttachment(recordType, recordId, refRecordType, refRecordId);
      setRefRecordType('');
      setRefRecordId('');
      setShowRefForm(false);
      await fetchAttachments();
    } catch (err) {
      console.error('Add reference failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAttachment(id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      const updated = await api.renameAttachment(id, renameValue.trim());
      setAttachments(prev => prev.map(a => a.id === id ? updated : a));
      setRenamingId(null);
      setRenameValue('');
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const startRename = (att: Attachment) => {
    setRenamingId(att.id);
    setRenameValue(att.fileName);
  };

  const renderIcon = (att: Attachment) => {
    const type = getAttachmentType(att);
    if (type === 'link') return <Link size={14} className="text-blue-400" />;
    if (type === 'reference') return <GitBranch size={14} className="text-amber-400" />;
    return <FileText size={14} className="text-zinc-400" />;
  };

  const renderInlinePreview = (att: Attachment) => {
    const type = getAttachmentType(att);
    if (type !== 'file') return null;

    const url = getDownloadUrl(att);

    if (isImageFile(att.fileName)) {
      return (
        <div className="mt-2 relative group/preview">
          <img
            src={url}
            alt={att.fileName}
            className="max-h-32 rounded-md border border-zinc-700 object-contain cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedPreview(att)}
          />
          <button
            onClick={() => setExpandedPreview(att)}
            className="absolute top-1 right-1 bg-zinc-900/80 text-zinc-300 hover:text-white rounded p-0.5 opacity-0 group-hover/preview:opacity-100 transition-opacity"
            title="View full size"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      );
    }

    if (isPdfFile(att.fileName)) {
      return (
        <div className="mt-2">
          <iframe
            src={url}
            title={att.fileName}
            className="w-full h-40 rounded-md border border-zinc-700 bg-zinc-950"
          />
          <button
            onClick={() => setExpandedPreview(att)}
            className="mt-1 text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
          >
            <Maximize2 size={10} /> View full size
          </button>
        </div>
      );
    }

    // Other files: icon + download link
    return (
      <div className="mt-2">
        <a
          href={url}
          download={att.fileName}
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-zinc-800 rounded-md px-2 py-1"
        >
          <FileDown size={12} /> Download {att.fileName}
        </a>
      </div>
    );
  };

  const renderAttachment = (att: Attachment) => {
    const type = getAttachmentType(att);
    const ref = type === 'reference' ? parseReference(att.filePath) : null;
    const isRenaming = renamingId === att.id;

    return (
      <div key={att.id} className="px-3 py-2 bg-zinc-800/50 rounded-lg group">
        <div className="flex items-center gap-3">
          {renderIcon(att)}
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(att.id);
                    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-sm text-zinc-200 outline-none focus:border-violet-500"
                  autoFocus
                />
                <button onClick={() => handleRename(att.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check size={13} /></button>
                <button onClick={() => { setRenamingId(null); setRenameValue(''); }} className="text-zinc-500 hover:text-zinc-300 p-0.5"><X size={13} /></button>
              </div>
            ) : (
              <>
                {type === 'link' ? (
                  <a
                    href={att.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 truncate block"
                  >
                    {att.fileName} <ExternalLink size={10} className="inline ml-1" />
                  </a>
                ) : type === 'reference' ? (
                  <span className="text-sm text-amber-400 truncate block">
                    {ref ? `${ref.refType} - ${ref.refId.slice(0, 8)}...` : att.fileName}
                  </span>
                ) : (
                  <span className="text-sm text-zinc-300 truncate block">{att.fileName}</span>
                )}
                {type === 'file' && att.fileSize > 0 && (
                  <span className="text-xs text-zinc-500">
                    {att.fileSize > 1048576
                      ? `${(att.fileSize / 1048576).toFixed(1)} MB`
                      : `${(att.fileSize / 1024).toFixed(1)} KB`}
                  </span>
                )}
              </>
            )}
          </div>
          {!isRenaming && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => startRename(att)}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                title="Rename"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => handleDelete(att.id)}
                className="text-zinc-500 hover:text-red-400 p-1"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
        {/* Inline preview */}
        {renderInlinePreview(att)}
      </div>
    );
  };

  // Don't render if no recordId (record not yet saved)
  if (!recordId) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Paperclip size={14} /> Attachments
        </h4>
        <p className="text-xs text-zinc-500">Save the record first to add attachments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Paperclip size={14} /> Attachments
          {attachments.length > 0 && (
            <span className="text-xs text-zinc-500">({attachments.length})</span>
          )}
        </h4>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1"
          >
            <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          <button
            onClick={() => { setShowLinkForm(!showLinkForm); setShowRefForm(false); }}
            className="text-xs px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1"
          >
            <Link size={12} /> Add Link
          </button>
          <button
            onClick={() => { setShowRefForm(!showRefForm); setShowLinkForm(false); }}
            className="text-xs px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1"
          >
            <GitBranch size={12} /> Add Reference
          </button>
        </div>
      </div>

      {/* Add Link Form */}
      {showLinkForm && (
        <div className="flex items-end gap-2 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-500">URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-500">Name (optional)</label>
            <input
              type="text"
              value={linkName}
              onChange={e => setLinkName(e.target.value)}
              placeholder="Link name"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200"
            />
          </div>
          <button
            onClick={handleAddLink}
            disabled={!linkUrl}
            className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* Add Reference Form */}
      {showRefForm && (
        <div className="flex items-end gap-2 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-500">Record Type</label>
            <select
              value={refRecordType}
              onChange={e => setRefRecordType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200"
            >
              <option value="">Select type...</option>
              {RECORD_TYPES.map(rt => (
                <option key={rt.key} value={rt.key}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-zinc-500">Record ID</label>
            <input
              type="text"
              value={refRecordId}
              onChange={e => setRefRecordId(e.target.value)}
              placeholder="Record ID"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200"
            />
          </div>
          <button
            onClick={handleAddReference}
            disabled={!refRecordType || !refRecordId}
            className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* Attachment List */}
      {loading ? (
        <p className="text-xs text-zinc-500">Loading attachments...</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-zinc-500">No attachments yet.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map(renderAttachment)}
        </div>
      )}

      {/* Expanded Preview Overlay */}
      {expandedPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setExpandedPreview(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedPreview(null)}
              className="absolute -top-3 -right-3 z-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
            >
              <X size={16} />
            </button>
            {isImageFile(expandedPreview.fileName) ? (
              <img
                src={getDownloadUrl(expandedPreview)}
                alt={expandedPreview.fileName}
                className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
              />
            ) : isPdfFile(expandedPreview.fileName) ? (
              <iframe
                src={getDownloadUrl(expandedPreview)}
                title={expandedPreview.fileName}
                className="w-full h-[85vh] rounded-lg border border-zinc-700 bg-white"
              />
            ) : null}
            <p className="text-center text-sm text-zinc-400 mt-3">{expandedPreview.fileName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
