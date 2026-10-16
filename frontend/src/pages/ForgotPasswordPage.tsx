import React, { useState } from 'react';
import { Mail, KeyRound, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { ForgotPasswordSchema, validateForm } from '../lib/validation';

interface ForgotPasswordPageProps {
  onNavigate: (tab: any) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(ForgotPasswordSchema, { email });
    if (!validation.success) {
      setErrorMessage(validation.errors.email || 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.forgotPassword(validation.data.email);
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.displayMessage || err.message || 'Unable to process reset request. Please verify email.');
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

        {isSubmitted ? (
          <div className="text-center py-4 space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Mail className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Check Your Inbox</h2>
              <p className="text-xs text-[#a1a1aa] mt-2 leading-relaxed">
                We've sent password reset instructions to{' '}
                <strong className="text-white font-medium">{email}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#18181c] border border-[#27272a] text-left text-xs space-y-2 text-[#94a3b8]">
              <div className="flex items-center gap-2 text-white font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Next steps</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                1. Click the secure link contained in the email to open the password reset page.
              </p>
              <p className="text-[11px] leading-relaxed">
                2. Enter and confirm your new account password.
              </p>
              <p className="text-[11px] text-[#71717a] pt-1">
                Note: Reset links expire in 1 hour. If you don't receive an email within a few minutes, check your spam or junk folder.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-medium bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-white flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try another email address</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('LOGIN')}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Reset Password
              </h1>
              <p className="text-xs text-[#94a3b8] mt-1">
                Enter your registered email address to receive password reset instructions.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2" role="alert">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                  Work Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@datapure.io"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Reset Link to Email</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
