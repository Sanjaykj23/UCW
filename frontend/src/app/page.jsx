'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, ArrowRight, SkipForward } from 'lucide-react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Dynamically import RadarSection with SSR disabled for Leaflet map support
const RadarSection = dynamic(() => import('@/components/RadarSection'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-white text-sm">
      LOADING_RADAR_MAP...
    </div>
  ),
});

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showAvatarSetup, setShowAvatarSetup] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
        .then((res) => {
          if (res.ok) return res.json();
          router.replace('/login');
          return null;
        })
        .then((data) => {
          if (data) {
            setCurrentUser(data);
            if (!data.profile_photo) {
              setShowAvatarSetup(true);
            }
            setAuthLoading(false);
          }
        })
        .catch((err) => {
          console.error('Error syncing user:', err);
          router.replace('/login');
        });
    }
  }, [router]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const completeAvatarSetup = (avatarData) => {
    if (typeof window !== 'undefined' && currentUser) {
      const updatedUser = { ...currentUser, avatar: avatarData || 'skipped', profile_photo: avatarData || 'skipped' };
      setCurrentUser(updatedUser);
      setShowAvatarSetup(false);
    }
  };

  if (!mounted || authLoading || !currentUser) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center font-mono text-white text-xs tracking-widest uppercase">
        VERIFYING_SESSION...
      </div>
    );
  }

  if (showAvatarSetup && currentUser) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center relative p-4">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="brutalist-panel p-8 w-full max-w-md flex flex-col items-center text-center z-10 bg-black border-2 border-white"
        >
          <Camera className="w-8 h-8 text-white mb-4" />
          <h1
            className="text-2xl font-black text-white glitch uppercase tracking-tighter mb-2"
            data-text="PROFILE_IMAGE_UPLOAD"
          >
            PROFILE_IMAGE_UPLOAD
          </h1>
          <p className="font-mono text-xs text-white/50 mb-8 uppercase tracking-widest">// initialize operator visual id</p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 bg-white/5 border-2 border-dashed border-white flex flex-col items-center justify-center cursor-pointer hover:border-secondary transition-colors mb-6 relative overflow-hidden group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <ImagePlus className="w-8 h-8 text-white/40 group-hover:text-white transition-colors mb-2" />
                <span className="font-mono text-[10px] text-white/40 uppercase">SELECT IMAGE</span>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="flex flex-col w-full gap-3 font-mono">
            {avatarPreview && (
              <button
                onClick={() => completeAvatarSetup(avatarPreview)}
                className="brutalist-button py-3 w-full text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>CONFIRM IDENTIFIER</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => completeAvatarSetup('skipped')}
              className="px-4 py-2 border border-white/20 text-white/40 hover:text-white text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>SKIP INITIALIZATION</span>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black flex flex-col relative overflow-hidden">
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="flex-1 flex flex-col z-10 relative h-full">
        <Header
          username={currentUser?.display_name || currentUser?.username || 'OPERATOR'}
          avatar={currentUser?.profile_photo || currentUser?.avatar}
        />

        <main className="flex-1 overflow-hidden relative">
          <RadarSection currentUser={currentUser} />
        </main>

        <Navbar />
      </div>
    </div>
  );
}
