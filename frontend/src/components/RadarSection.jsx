'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, ChevronDown, CheckCircle2, UserPlus, Eye } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const customIcon = typeof window !== 'undefined' ? new L.DivIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <rect x="1" y="1" width="22" height="22" fill="black" stroke="white" stroke-width="2"/>
    <rect x="9" y="9" width="6" height="6" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
}) : null;

const LOCATIONS = [
  { id: 'SALIGRAMAM_SEC', name: 'SALIGRAMAM_SEC', lat: 13.0577, lng: 80.1982 },
  { id: 'PORUR_SEC',      name: 'PORUR_SEC',      lat: 13.0333, lng: 80.1583 },
  { id: 'MADIPAKKAM_SEC', name: 'MADIPAKKAM_SEC', lat: 12.9667, lng: 80.1970 },
  { id: 'CHENNAI_CENTRAL',name: 'CHENNAI_CENTRAL',lat: 13.0827, lng: 80.2707 },
  { id: 'VELACHERY_SEC',  name: 'VELACHERY_SEC',  lat: 12.9754, lng: 80.2205 },
  { id: 'ADYAR_SEC',      name: 'ADYAR_SEC',      lat: 13.0033, lng: 80.2555 },
];

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.9 });
  }, [center, zoom, map]);
  return null;
}

const RadarSection = ({ currentUser }) => {
  const router = useRouter();
  const defaultArea = LOCATIONS.find(loc => loc.id === currentUser?.area) || LOCATIONS[0];
  
  const [selectedArea, setSelectedArea] = useState(defaultArea);
  const [isScanning, setIsScanning]     = useState(false);
  const [foundUsers, setFoundUsers]     = useState([]);
  const [mapCenter, setMapCenter]       = useState([defaultArea.lat, defaultArea.lng]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    handleAreaSelect(defaultArea);
  }, []);

  const handleAreaSelect = async (loc) => {
    setSelectedArea(loc);
    setMapCenter([loc.lat, loc.lng]);
    setFoundUsers([]);
    setIsScanning(true);
    setShowDropdown(false);

    try {
      // Search real registered users strictly from the selected area from backend database
      const res = await fetch(`${API_BASE_URL}/api/users/by-area?area=${encodeURIComponent(loc.name)}`, { credentials: 'include' });
      if (res.ok) {
        const usersData = await res.json();
        
        // Attach location coordinates around selected sector
        const mappedUsers = usersData.map((user, idx) => ({
          id: user.user_id,
          username: user.username,
          name: user.display_name || user.username,
          area: user.area || loc.name,
          lat: loc.lat + (idx % 2 === 0 ? 0.0015 * (idx + 1) : -0.0012 * (idx + 1)),
          lng: loc.lng + (idx % 2 === 0 ? -0.0012 * (idx + 1) : 0.0018 * (idx + 1)),
          avatar: user.profile_photo
        }));
        
        setTimeout(() => {
          setIsScanning(false);
          setFoundUsers(mappedUsers);
        }, 800);
      } else {
        setIsScanning(false);
      }
    } catch (err) {
      console.error('Radar scan error:', err);
      setIsScanning(false);
    }
  };

  const formatAvatarUrl = (url) => {
    if (!url || url === 'skipped') return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="w-full h-full relative flex flex-col p-4 pb-[80px] overflow-y-auto">

      {/* ─── Controls ─────────────────────────────────── */}
      <div className="z-[1000] mb-4">
        <div className="brutalist-panel p-4 bg-black">
          <h2 className="text-white font-black mb-4 flex items-center gap-2 tracking-widest text-lg font-mono">
            <Radar className={`w-5 h-5 shrink-0 ${isScanning ? 'text-secondary animate-pulse' : 'text-white'}`} />
            <span className="glitch uppercase" data-text={selectedArea.name}>{selectedArea.name} SCAN</span>
          </h2>
          
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full bg-white text-black font-bold uppercase tracking-widest flex items-center justify-between px-4 py-3 border-2 border-white cursor-pointer"
            >
              <span className="truncate">OPERATORS NEAR {selectedArea.name}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-black border-2 border-white z-[2000] shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                >
                  {LOCATIONS.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleAreaSelect(loc)}
                      className={`w-full text-left px-4 py-3 font-mono text-sm uppercase tracking-widest border-b border-white/20 last:border-0 hover:bg-white/10 transition-colors
                                  ${selectedArea.id === loc.id ? 'text-secondary font-bold' : 'text-white'}`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── Map ──────────────────────────────────────── */}
      <div className="h-[40vh] min-h-[300px] border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] relative z-10 overflow-hidden mb-6 shrink-0">
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <FlyTo center={mapCenter} zoom={14} />

          {selectedArea && customIcon && (
            <Marker position={[selectedArea.lat, selectedArea.lng]} icon={customIcon}>
              <Popup>
                <span className="font-mono font-bold uppercase text-white text-xs">
                  {isScanning ? 'SCANNING...' : `CENTER: ${selectedArea.name}`}
                </span>
              </Popup>
            </Marker>
          )}

          {foundUsers.map((user) => (
            customIcon && (
              <Marker key={user.id} position={[user.lat, user.lng]} icon={customIcon}>
                <Popup>
                  <span className="font-mono font-bold uppercase text-white text-xs">{user.name}</span>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>

        {/* Radar scan overlay */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-[1000] flex items-center justify-center bg-black/40"
            >
              {[0, 0.4, 0.8].map((delay) => (
                <motion.div
                  key={delay}
                  className="absolute w-64 h-64 border-4 border-white"
                  animate={{ scale: [0, 2.5], opacity: [1, 0], rotate: [0, 90] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay, ease: 'easeOut' }}
                />
              ))}
              <div className="w-4 h-4 bg-secondary animate-ping rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Real Registered Operators List ──────────────────────────────────────── */}
      <div className="flex-1 min-h-[200px]">
        <h3 className="font-mono text-sm uppercase tracking-widest text-white/50 mb-4 border-b border-white/20 pb-2">
          [ {isScanning ? 'SCANNING_SECTOR...' : `${foundUsers.length}_REGISTERED_OPERATORS_DETECTED`} ]
        </h3>
        
        {isScanning ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse bg-white/5 border border-white/10 p-4 flex gap-4 h-24"></div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {foundUsers.length === 0 ? (
              <div className="p-8 text-center border border-white/20 bg-white/5 text-white/50 font-mono text-xs uppercase">
                NO_REGISTERED_OPERATORS_FOUND_IN_SECTOR
              </div>
            ) : (
              foundUsers.map((user) => (
                <div key={user.id} className="brutalist-panel p-3 bg-black flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/10 border border-white flex items-center justify-center shrink-0 overflow-hidden">
                      {formatAvatarUrl(user.avatar) ? (
                        <img src={formatAvatarUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-mono font-bold text-white text-lg">{user.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-bold tracking-widest uppercase text-sm">{user.name}</p>
                      <p className="text-emerald-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> @{user.username}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/user/${user.username}`)}
                    className="bg-white text-black font-mono font-bold uppercase text-xs px-4 py-2 border-2 border-white hover:bg-black hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>VIEW PROFILE</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default RadarSection;
