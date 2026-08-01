'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Terminal, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '652573570453-0gecnloheb1g785gb7919nns04j9v0uo.apps.googleusercontent.com';

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const tokenClientRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scriptId = 'google-gsi-script';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  }, []);

  const handleGoogleAuth = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.access_token) {
              await processGoogleLogin(tokenResponse.access_token);
            } else {
              setLoading(false);
            }
          },
          error_callback: (err) => {
            console.error('OAuth error:', err);
            setLoading(false);
            setErrorMessage('Google Authentication popup was closed or interrupted.');
          },
        });

        tokenClientRef.current = client;
        client.requestAccessToken();
      } catch (err) {
        console.error('Failed to init token client:', err);
        setLoading(false);
        triggerFallbackIdPrompt();
      }
    } else {
      triggerFallbackIdPrompt();
    }
  };

  const triggerFallbackIdPrompt = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response.credential) return;
            await processGoogleLogin(response.credential);
          },
          auto_select: false,
          use_fedcm_for_prompt: false,
        });

        window.google.accounts.id.prompt();
      } catch (err) {
        setLoading(false);
        setErrorMessage('Google Authentication SDK loading... Please retry.');
      }
    } else {
      setLoading(false);
      setErrorMessage('Google Authentication SDK loading... Please retry.');
    }
  };

  const processGoogleLogin = async (tokenStr) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id_token: tokenStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.detail === 'EMAIL_NOT_REGISTERED' || res.status === 404) {
          setErrorMessage('EMAIL_NOT_REGISTERED: Account for this Gmail does not exist in database.');
          setSuccessMessage('PLEASE REGISTER FIRST! REDIRECTING TO REGISTRATION PAGE IN 2 SECONDS...');

          setTimeout(() => {
            router.push('/register');
          }, 2200);
          return;
        }
        throw new Error(data.detail || 'Google login failed');
      }

      setSuccessMessage('GOOGLE_AUTH_SUCCESS. INITIALIZING_SYSTEM...');

      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || 'GOOGLE_LOGIN_FAILED');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginIdentifier || !loginPassword) {
      setErrorMessage('PLEASE_ENTER_CREDENTIALS');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid username/email or password');
      }

      setSuccessMessage('ACCESS_GRANTED. INITIALIZING_SYSTEM...');

      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || 'AUTHENTICATION_FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative bg-black p-4 py-12">
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Corner marks */}
      <div className="fixed top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/40 z-0 pointer-events-none" />
      <div className="fixed top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/40 z-0 pointer-events-none" />
      <div className="fixed bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/40 z-0 pointer-events-none" />
      <div className="fixed bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/40 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-lg brutalist-panel p-6 sm:p-8 z-10 my-auto shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] bg-black border-2 border-white"
      >
        {/* Header */}
        <div className="flex flex-col items-start mb-8 pb-4 border-b-2 border-white/20">
          <div className="w-10 h-10 bg-white flex items-center justify-center mb-4">
            <Terminal className="w-6 h-6 text-black" />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-black text-white glitch uppercase tracking-tighter leading-none"
            data-text="SYSTEM.ENTRY"
          >
            SYSTEM.ENTRY
          </h1>
          <p className="font-mono text-xs mt-3 text-white/50 uppercase tracking-widest">
            // INITIALIZE CONNECTION SEQUENCE & AUTHENTICATION
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-950/40 border-2 border-red-500 text-red-400 font-mono text-xs flex items-center gap-3 uppercase">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>ERR: {errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-950/40 border-2 border-emerald-500 text-emerald-400 font-mono text-xs flex items-center gap-3 uppercase">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Credentials Login Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
              &gt;&nbsp;Email_Or_Username
            </label>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="ENTER_EMAIL_OR_USERNAME_"
              className="w-full px-4 py-4 bg-black border-2 border-white text-white font-mono text-sm
                         placeholder-white/25 focus:outline-none focus:border-emerald-400 transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
              &gt;&nbsp;Authentication_Password
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="ENTER_PASSWORD_"
              className="w-full px-4 py-4 bg-black border-2 border-white text-white font-mono text-sm
                         placeholder-white/25 focus:outline-none focus:border-emerald-400 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="brutalist-button w-full flex items-center justify-between mt-4 py-4 hover:bg-emerald-400 hover:text-black transition-all"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'Execute Access'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-6 items-center">
          <div className="flex-grow border-t border-white/20"></div>
          <span className="flex-shrink-0 mx-4 text-white/50 text-xs font-mono uppercase tracking-widest">
            Or_Continue_With
          </span>
          <div className="flex-grow border-t border-white/20"></div>
        </div>

        {/* Single Pure Google OAuth Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black border-2 border-white font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all cursor-pointer font-bold shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>{loading ? 'AUTHENTICATING_GOOGLE...' : 'Sign In With Google'}</span>
          </button>
        </div>

        {/* Link to Register */}
        <div className="pt-6 mt-6 border-t border-white/20 text-center">
          <button
            type="button"
            onClick={() => router.push('/register')}
            className="font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            [?] NEW OPERATOR? REGISTER HERE
          </button>
        </div>
      </motion.div>
    </div>
  );
}
