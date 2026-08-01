'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import ChatSection from '@/components/ChatSection';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ChatsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

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
            setAuthLoading(false);
          }
        })
        .catch((err) => {
          console.error('Error syncing user:', err);
          router.replace('/login');
        });
    }
  }, [router]);

  if (!mounted || authLoading || !currentUser) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center font-mono text-white text-xs tracking-widest uppercase">
        VERIFYING_SESSION...
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
          username={currentUser.display_name || currentUser.username}
          avatar={currentUser.profile_photo || currentUser.avatar}
        />

        <main className="flex-1 overflow-hidden relative">
          <ChatSection currentUser={currentUser} />
        </main>

        <Navbar />
      </div>
    </div>
  );
}
