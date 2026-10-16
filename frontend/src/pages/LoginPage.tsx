import React, { useState } from 'react';
import { Layers, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { env } from '../config/env';
import { LoginSchema, validateForm } from '../lib/validation';

interface LoginPageProps {
  onNavigate: (tab: any, options?: { toast?: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTarget = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('redirect') || sessionStorage.getItem('datapure_redirect_after_login'))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(LoginSchema, { email, password });
    if (!validation.success) {
      if (!email.trim() && !password) {
        setErrorMessage('Please enter both your email address and password.');
      } else {
        setErrorMessage(validation.errors.email || validation.errors.password || 'Please check your email and password.');
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(validation.data.email, validation.data.password);

      let targetTab: any = 'BOARD';
      if (redirectTarget) {
        const lower = redirectTarget.toLowerCase();
        if (lower.includes('/team')) targetTab = 'USERS';
        else if (lower.includes('/rbac')) targetTab = 'RBAC';
        else if (lower.includes('/audit')) targetTab = 'AUDIT';
        else if (lower.includes('/profile')) targetTab = 'PROFILE';
        sessionStorage.removeItem('datapure_redirect_after_login');
      }

      onNavigate(targetTab, { toast: 'Signed in successfully. Welcome back!' });
    } catch (err: any) {
      setErrorMessage(err.displayMessage || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            DataPure Task Manager
          </h1>
          <p className="text-xs text-[#94a3b8] mt-1">
            Sign in to access your engineering workspace
          </p>
        </div>

        {/* Redirect Notice */}
        {redirectTarget && !errorMessage && (
          <div className="mb-6 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />
            <span>Sign in to access <code className="font-mono text-white px-1 py-0.5 rounded bg-[#18181c]">{redirectTarget}</code></span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2" role="alert">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
              Email Address <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#a1a1aa]">
                Password <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
              </label>
              <button
                type="button"
                onClick={() => onNavigate('FORGOT_PASSWORD')}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#d4d4d8] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded p-0.5"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Autofill Section (Hidden in Production) */}
        {!env.isProduction && (
          <div className="mt-8 pt-6 border-t border-[#27272a]">
            <p className="text-[11px] font-medium text-[#71717a] uppercase tracking-wider mb-3 text-center">
              Quick Demo Autofill
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleAutofill('admin@datapure.io', 'Admin123!')}
                className="px-2 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[11px] text-amber-300 flex flex-col items-center gap-0.5 transition"
              >
                <span>Admin</span>
                <span className="text-[9px] text-[#71717a]">All Scopes</span>
              </button>

              <button
                type="button"
                onClick={() => handleAutofill('member@datapure.io', 'Member123!')}
                className="px-2 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[11px] text-blue-300 flex flex-col items-center gap-0.5 transition"
              >
                <span>Member</span>
                <span className="text-[9px] text-[#71717a]">Tasks CRUD</span>
              </button>

              <button
                type="button"
                onClick={() => handleAutofill('viewer@datapure.io', 'Viewer123!')}
                className="px-2 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[11px] text-purple-300 flex flex-col items-center gap-0.5 transition"
              >
                <span>Viewer</span>
                <span className="text-[9px] text-[#71717a]">Read Only</span>
              </button>
            </div>
          </div>
        )}

        {/* Access Notice */}
        <div className="mt-6 text-center text-xs text-[#71717a] pt-4 border-t border-[#27272a]/50">
          Account access is managed by workspace administrators.<br />
          Need access? Contact your organization administrator.
        </div>
      </div>
    </div>
  );
};
