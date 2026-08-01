'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Crosshair, MessageSquareDashed, Fingerprint } from 'lucide-react';

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { path: '/', icon: Crosshair, label: 'RADAR' },
    { path: '/chats', icon: MessageSquareDashed, label: 'COMMS' },
    { path: '/profile', icon: Fingerprint, label: 'IDENTITY' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <div className="brutalist-panel p-2 flex items-center justify-between bg-black">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path;
          
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={`relative flex flex-1 items-center justify-center p-3 gap-2 border-2 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-white text-black border-white' 
                  : 'bg-black text-white border-transparent hover:border-white/50'
              }`}
            >
              <Icon 
                strokeWidth={isActive ? 3 : 2}
                className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} 
              />
              <span className="text-xs font-black tracking-widest hidden sm:block">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navbar;
