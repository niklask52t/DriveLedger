import { useState } from 'react';
import { Eye, EyeOff, Loader2, Shield, Mail, User as UserIcon } from 'lucide-react';
import { api } from '../../api';
import { formatDate } from '../../utils';
import type { User } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

interface ProfileTabProps {
  user: User;
  refreshUser: () => void;
}

export default function ProfileTab({ user, refreshUser }: ProfileTabProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async () => {
    setMessage(null);

    if (!currentPassword || !newPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
              <UserIcon size={16} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Username</p>
              <p className="text-sm text-zinc-50">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Mail size={16} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Email</p>
              <p className="text-sm text-zinc-50">
                {user.email}
                {user.emailVerified && (
                  <span className="ml-2 text-xs text-emerald-400">Verified</span>
                )}
                {!user.emailVerified && (
                  <span className="ml-2 text-xs text-amber-400">Not verified</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Shield size={16} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Role</p>
              <p className="text-sm text-zinc-50">{user.isAdmin ? 'Administrator' : 'User'}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Member since {formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Change Password</h3>
        <div className="space-y-5 max-w-md">
          <div>
            <label className={labelClass}>Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className={inputClass}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className={inputClass}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={inputClass}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                message.type === 'success'
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-red-400/10 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
