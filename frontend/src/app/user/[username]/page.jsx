'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, 
  MapPin, 
  UserPlus, 
  Check, 
  Clock, 
  MessageSquare, 
  ArrowLeft, 
  Terminal, 
  ShieldCheck, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params?.username;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (usernameParam) {
      fetchUserProfile(usernameParam);
    }
  }, [usernameParam]);

  const fetchUserProfile = async (targetUsername) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(targetUsername)}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        throw new Error(data.detail || 'User profile not found');
      }

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setErrorMessage(err.message || 'FAILED_TO_LOAD_PROFILE');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!profile) return;
    setActionLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/connections/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ receiver_id: profile.user_id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error(data.detail || 'Failed to send connection request');
      }

      setSuccessMessage('CONNECTION_REQUEST_DISPATCHED!');
      setProfile((prev) => ({ ...prev, connection_status: 'PENDING_SENT', connection_id: data.connection_id }));
    } catch (err) {
      setErrorMessage(err.message || 'CONNECTION_REQUEST_FAILED');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!profile?.connection_id) return;
    setActionLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/connections/action?action=accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ connection_id: profile.connection_id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error(data.detail || 'Failed to accept connection');
      }

      setSuccessMessage('CONNECTION_ACCEPTED! CHAT_CHANNEL_ESTABLISHED.');
      setProfile((prev) => ({ ...prev, connection_status: 'ACCEPTED' }));
    } catch (err) {
      setErrorMessage(err.message || 'ACCEPTANCE_FAILED');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4 font-mono">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 animate-pulse text-white" />
          <span className="text-sm uppercase tracking-widest">FETCHING_OPERATOR_PROFILE...</span>
        </div>
      </div>
    );
  }

  if (errorMessage && !profile) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="brutalist-panel p-8 max-w-md w-full bg-black border-2 border-white text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="font-mono text-lg font-bold text-red-400 uppercase">ERR: {errorMessage}</h2>
          <button
            onClick={() => router.push('/')}
            className="brutalist-button px-6 py-3 w-full font-mono text-xs uppercase flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Radar
          </button>
        </div>
      </div>
    );
  }

  const skillsList = profile?.skills ? profile.skills.split(',').map((s) => s.trim()) : [];
  const interestsList = profile?.interests ? profile.interests.split(',').map((i) => i.trim()) : [];

  return (
    <div className="min-h-screen w-full bg-black text-white p-4 py-8 relative">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Navigation Top Bar */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 font-mono text-xs text-white/60 hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> [&lt;] BACK_TO_NETWORK
        </button>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-4 bg-red-950/40 border-2 border-red-500 text-red-400 font-mono text-xs flex items-center gap-3 uppercase">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>ERR: {errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-950/40 border-2 border-emerald-500 text-emerald-400 font-mono text-xs flex items-center gap-3 uppercase">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="brutalist-panel bg-black border-2 border-white p-6 sm:p-8 space-y-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
        >
          {/* Header Banner & Avatar */}
          <div className="relative">
            <div className="h-36 w-full bg-gradient-to-r from-emerald-950 via-black to-blue-950 border-2 border-white flex items-center justify-between p-4 overflow-hidden relative">
              {profile?.banner_photo ? (
                <img
                  src={
                    profile.banner_photo.startsWith('http') || profile.banner_photo.startsWith('data:')
                      ? profile.banner_photo
                      : `${API_BASE_URL}${profile.banner_photo.startsWith('/') ? '' : '/'}${profile.banner_photo}`
                  }
                  alt="Banner"
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <>
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest relative z-10">
                    // OPERATOR_ID: {profile?.user_id}
                  </span>
                  <Terminal className="w-16 h-16 text-white/5 relative z-10" />
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 px-4 relative z-10">
              <div className="w-24 h-24 bg-black border-2 border-white flex items-center justify-center overflow-hidden shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] shrink-0">
                {profile?.profile_photo && profile.profile_photo !== 'skipped' ? (
                  <img
                    src={
                      profile.profile_photo.startsWith('http') || profile.profile_photo.startsWith('data:')
                        ? profile.profile_photo
                        : `${API_BASE_URL}${profile.profile_photo.startsWith('/') ? '' : '/'}${profile.profile_photo}`
                    }
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white/40" />
                )}
              </div>

              {/* Dynamic Connection Action Buttons */}
              <div className="shrink-0">
                {profile?.connection_status === 'NOT_CONNECTED' && (
                  <button
                    onClick={handleSendRequest}
                    disabled={actionLoading}
                    className="brutalist-button py-3 px-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest hover:bg-emerald-400 hover:text-black transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{actionLoading ? 'DISPATCHING...' : 'Connect'}</span>
                  </button>
                )}

                {profile?.connection_status === 'PENDING_SENT' && (
                  <div className="py-3 px-6 bg-white/10 border-2 border-white/40 font-mono text-xs uppercase tracking-widest text-white/70 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Request Sent</span>
                  </div>
                )}

                {profile?.connection_status === 'PENDING_RECEIVED' && (
                  <button
                    onClick={handleAcceptRequest}
                    disabled={actionLoading}
                    className="brutalist-button py-3 px-6 bg-emerald-500 text-black flex items-center gap-2 font-mono text-xs uppercase tracking-widest hover:bg-white transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{actionLoading ? 'ACCEPTING...' : 'Accept Request'}</span>
                  </button>
                )}

                {profile?.connection_status === 'ACCEPTED' && (
                  <div className="flex items-center gap-3">
                    <div className="py-3 px-4 bg-emerald-950/60 border-2 border-emerald-500 font-mono text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Connected</span>
                    </div>
                    <button
                      onClick={() => router.push('/chats')}
                      className="brutalist-button py-3 px-4 flex items-center gap-2 font-mono text-xs uppercase"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  </div>
                )}

                {profile?.connection_status === 'SELF' && (
                  <div className="py-3 px-6 bg-white text-black font-mono text-xs font-bold uppercase tracking-widest">
                    Your Profile
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-3 pt-2 border-b border-white/20 pb-6">
            <h1 className="text-3xl sm:text-4xl font-black text-white glitch uppercase tracking-tight">
              {profile?.display_name || profile?.username}
            </h1>
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-white/60 uppercase tracking-widest">
              <span className="text-emerald-400 font-bold">@{profile?.username}</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile?.area || 'SALIGRAMAM_SEC'}
              </span>
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/50">
              // OPERATOR_BIO
            </h3>
            <p className="font-mono text-sm text-white/90 leading-relaxed bg-white/5 p-4 border border-white/20">
              {profile?.bio || 'Operational network operator actively discovering connections across sectors.'}
            </p>
          </div>

          {/* Skills & Interests Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Skills */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                SKILLS & CAPABILITIES
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-black border border-white text-white font-mono text-xs uppercase"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                OPERATIONAL INTERESTS
              </h3>
              <div className="flex flex-wrap gap-2">
                {interestsList.map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-black border border-white/40 text-white/80 font-mono text-xs uppercase"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
