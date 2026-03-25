import { useState, type FormEvent } from 'react';
import {
  AlertCircle, Loader2, Eye, EyeOff, CheckCircle,
} from 'lucide-react';
import { api, ApiError } from '../../api';
import type { User } from '../../types';
import { format } from 'date-fns';

const inputClass = 'w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

interface ProfileTabProps {
  user: User | null;
  refreshUser: () => Promise<void>;
}

export default function ProfileTab({ user, refreshUser }: ProfileTabProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User info card */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-dark-400">Username</span>
            <p className="text-dark-100 font-medium">{user?.username || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-dark-400">Email</span>
            <p className="text-dark-100 font-medium">{user?.email || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-dark-400">Role</span>
            <p className="text-dark-100 font-medium">{user?.isAdmin ? 'Administrator' : 'User'}</p>
          </div>
          <div>
            <span className="text-sm text-dark-400">Member since</span>
            <p className="text-dark-100 font-medium">
              {user?.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-4">Change Password</h3>

        {error && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-4">
            <AlertCircle size={18} className="text-danger shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-4 py-3 mb-4">
            <CheckCircle size={18} className="text-success shrink-0" />
            <p className="text-sm text-success">{success}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={`${inputClass} pr-11`}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={`${inputClass} pr-11`}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
