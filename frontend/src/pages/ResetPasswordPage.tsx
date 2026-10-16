import React, { useState } from 'react';
import { Lock, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

import { ResetPasswordSchema, validateForm } from '../lib/validation';

interface ResetPasswordPageProps {
  initialToken?: string;
  onNavigate: (tab: any) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ initialToken = '', onNavigate }) => {
  const token = initialToken;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage('Reset token is missing or invalid.');
      return;
    }

    const validation = validateForm(ResetPasswordSchema, {
      password: newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      setErrorMessage(validation.errors.confirmPassword || validation.errors.password || 'Please check password requirements.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.resetPassword(token, validation.data.password);
      setIsSuccess(true);
      setTimeout(() => {
        onNavigate('LOGIN');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.displayMessage || err.message || 'Reset failed. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-8">
        <button
          type="button"
          onClick={() => onNavigate('LOGIN')}
          className="mb-6 flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs text-[#94a3b8] mt-1">
            Define a new password for your account
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2" role="alert">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!token ? (
          <div className="text-center py-4 space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left space-y-2">
              <p className="font-semibold text-white">No Reset Token Provided</p>
              <p className="text-[#a1a1aa] leading-relaxed">
                Please open the password reset link sent to your email address, or request a new reset link below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('FORGOT_PASSWORD')}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2"
            >
              Request New Password Reset
            </button>
          </div>
        ) : isSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white">Password Reset Successful!</h4>
            <p className="text-xs text-[#94a3b8]">
              Redirecting you to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                New Password (Min 6 chars) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#d4d4d8] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded p-0.5"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-[11px] text-red-400 mt-1">Must be at least 6 characters</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Confirm New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#d4d4d8] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded p-0.5"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>


            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
