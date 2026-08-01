'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, UserPlus, CheckCircle2, AlertTriangle, Check, RotateCcw } from 'lucide-react';

const AREAS = [
  'SALIGRAMAM_SEC',
  'PORUR_SEC',
  'MADIPAKKAM_SEC',
  'CHENNAI_CENTRAL',
  'VELACHERY_SEC',
  'ADYAR_SEC',
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '652573570453-0gecnloheb1g785gb7919nns04j9v0uo.apps.googleusercontent.com';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = Google Sign Up, 2 = Operator Credentials
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);

  // Form state
  const [regForm, setRegForm] = useState({
    username: '',
    displayName: '',
    phone: '',
    email: '',
    password: '',
    area: AREAS[0],
  });

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
              await verifyAndProcessGoogleEmail(tokenResponse.access_token);
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
            await verifyAndProcessGoogleEmail(response.credential);
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

  const verifyAndProcessGoogleEmail = async (tokenStr) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: tokenStr }),
      });

      const googleUserData = await res.json();

      if (!res.ok) {
        throw new Error(googleUserData.detail || 'Google verification failed');
      }

      // Check if email already exists in PostgreSQL database
      if (googleUserData.exists_in_db) {
        setErrorMessage(`EMAIL_ALREADY_EXISTS: ${googleUserData.email} is already registered in database.`);
        setSuccessMessage('ACCOUNT DETECTED! REDIRECTING TO LOGIN PAGE IN 2 SECONDS...');
        
        setTimeout(() => {
          router.push('/login');
        }, 2200);
        return;
      }

      // Email is fresh and available for new account registration
      setGoogleToken(tokenStr);
      setRegForm((prev) => ({
        ...prev,
        email: googleUserData.email,
        displayName: googleUserData.name || prev.displayName,
      }));

      setSuccessMessage(`GOOGLE_EMAIL_VERIFIED: ${googleUserData.email}`);
      
      setTimeout(() => {
        setStep(2);
        setSuccessMessage('');
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'GOOGLE_VERIFICATION_FAILED');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regForm.username || !regForm.email || !regForm.password) {
      setErrorMessage('ALL_REQUIRED_FIELDS_MUST_BE_FILLED');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: regForm.username,
          display_name: regForm.displayName || regForm.username,
          phone: regForm.phone,
          area: regForm.area,
          email: regForm.email,
          password: regForm.password,
          google_token: googleToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccessMessage('ACCOUNT_CREATED_SUCCESSFULLY! INITIALIZING_SYSTEM...');

      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'REGISTRATION_FAILED_SERVER_ERROR');
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
            data-text="SYSTEM.REGISTER"
          >
            SYSTEM.REGISTER
          </h1>
          <p className="font-mono text-xs mt-3 text-white/50 uppercase tracking-widest">
            {step === 1 ? '// STEP 1 of 2: GOOGLE AUTHENTICATION' : '// STEP 2 of 2: OPERATOR CREDENTIALS'}
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

        <AnimatePresence mode="wait">
          {step === 1 && (
            /* ────────────────── STEP 1: GOOGLE SIGN UP FIRST ────────────────── */
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="p-6 bg-white/5 border-2 border-white/30 space-y-4 text-center">
                <div className="mx-auto w-12 h-12 bg-white flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-white">
                    SIGN UP WITH GOOGLE FIRST
                  </h3>
                  <p className="font-mono text-xs text-white/60 mt-2 leading-relaxed">
                    Please verify your Google email address identity first before completing your account credentials.
                  </p>
                </div>
              </div>

              {/* Single Official Google Sign-Up Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black border-2 border-white font-mono text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-all cursor-pointer font-bold shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>{loading ? 'VERIFYING_GOOGLE...' : 'Sign Up With Google'}</span>
              </button>

              {/* Link to Login */}
              <div className="pt-6 border-t border-white/20 text-center">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  [&lt;] ALREADY REGISTERED? LOGIN HERE
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            /* ────────────────── STEP 2: ENTER CREDENTIALS ────────────────── */
            <motion.form
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleRegisterSubmit}
              className="space-y-5"
            >
              {/* Verified Email Banner */}
              <div className="p-3.5 bg-emerald-950/40 border-2 border-emerald-500/60 text-emerald-400 font-mono text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="truncate">&gt;&nbsp;{regForm.email}</span>
                </div>
                <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 font-bold uppercase shrink-0">
                  Google Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Username */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
                    &gt;&nbsp;Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    placeholder="USERNAME_"
                    className="w-full px-3 py-3 bg-black border-2 border-white text-white font-mono text-xs
                               placeholder-white/25 focus:outline-none focus:border-emerald-400 transition-colors"
                    required
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
                    &gt;&nbsp;Display_Name
                  </label>
                  <input
                    type="text"
                    value={regForm.displayName}
                    onChange={(e) => setRegForm({ ...regForm, displayName: e.target.value })}
                    placeholder="DISPLAY_NAME_"
                    className="w-full px-3 py-3 bg-black border-2 border-white text-white font-mono text-xs
                               placeholder-white/25 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
                    &gt;&nbsp;Phone_Number
                  </label>
                  <input
                    type="tel"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="PHONE_NUMBER_"
                    className="w-full px-3 py-3 bg-black border-2 border-white text-white font-mono text-xs
                               placeholder-white/25 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>

                {/* Area / Sector */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
                    &gt;&nbsp;Area_Sector
                  </label>
                  <select
                    value={regForm.area}
                    onChange={(e) => setRegForm({ ...regForm, area: e.target.value })}
                    className="w-full px-3 py-3 bg-black border-2 border-white text-white font-mono text-xs
                               focus:outline-none focus:border-emerald-400 transition-colors cursor-pointer"
                  >
                    {AREAS.map((area) => (
                      <option key={area} value={area} className="bg-black text-white">
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email (Read only verified) */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
                  &gt;&nbsp;Email_Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={regForm.email}
                  readOnly
                  className="w-full px-3 py-3 bg-black border-2 border-emerald-500 text-emerald-300 font-mono text-xs cursor-not-allowed opacity-90"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-widest text-white/70">
                  &gt;&nbsp;Create_Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="CREATE_SECURE_PASSWORD_"
                  className="w-full px-3 py-3 bg-black border-2 border-white text-white font-mono text-xs
                             placeholder-white/25 focus:outline-none focus:border-emerald-400 transition-colors"
                  required
                />
              </div>

              {/* Create Account Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="brutalist-button w-full flex items-center justify-between mt-6 py-4 hover:bg-emerald-400 hover:text-black transition-all"
              >
                <span>{loading ? 'CREATING_ACCOUNT...' : 'CREATE ACCOUNT'}</span>
                <UserPlus className="w-5 h-5" />
              </button>

              <div className="pt-4 flex items-center justify-between border-t border-white/20">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> RE-VERIFY GOOGLE EMAIL
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  [&lt;] LOGIN HERE
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
