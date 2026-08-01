'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserSquare2, ChevronRight, Loader2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const Header = ({ username, avatar }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const isValidAvatar = avatar && avatar !== 'skipped';

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
            setShowDropdown(true);
          }
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (targetUsername) => {
    setShowDropdown(false);
    setSearchQuery('');
    router.push(`/user/${targetUsername}`);
  };

  const formatAvatarUrl = (url) => {
    if (!url || url === 'skipped') return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const formattedAvatar = formatAvatarUrl(avatar);

  return (
    <header className="px-4 py-3 mx-4 mt-4 z-30 flex items-center justify-between gap-4 brutalist-panel relative">
      {/* User ID */}
      <div 
        className="flex items-center gap-3 cursor-pointer group shrink-0"
        onClick={() => username && router.push(`/user/${username}`)}
      >
        <div className="w-10 h-10 bg-white flex items-center justify-center overflow-hidden group-hover:bg-secondary transition-colors border-2 border-transparent group-hover:border-white">
          {formattedAvatar ? (
            <img src={formattedAvatar} alt="Profile" className="w-full h-full object-cover group-hover:grayscale-0 transition-all" />
          ) : (
            <UserSquare2 className="w-6 h-6 text-black group-hover:text-white transition-colors" />
          )}
        </div>
        <div className="hidden sm:block">
          <p className="font-mono text-[9px] text-white/40 uppercase tracking-widest">ID_</p>
          <p className="text-base text-white font-black uppercase tracking-tighter">
            {username || ''}
          </p>
        </div>
      </div>

      {/* Live Search Bar */}
      <div className="flex-1 max-w-md flex relative" ref={dropdownRef}>
        <div className="bg-white border-2 border-white px-3 flex items-center justify-center shrink-0">
          {loading ? (
            <Loader2 className="h-4 w-4 text-black animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-black" />
          )}
        </div>
        <input
          type="text"
          className="w-full px-3 py-2 bg-black border-2 border-l-0 border-white text-white
                     font-mono text-sm placeholder-white/25 focus:outline-none focus:bg-white/5
                     uppercase transition-colors"
          placeholder="SEARCH_OPERATORS_(@john)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim() && setShowDropdown(true)}
        />

        {/* Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-black border-2 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] z-50 max-h-80 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.user_id}
                  onClick={() => handleSelectUser(user.username)}
                  className="p-3 border-b border-white/20 hover:bg-white hover:text-black transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 group-hover:bg-black group-hover:text-white flex items-center justify-center font-mono text-xs font-bold border border-white/40 overflow-hidden">
                      {formatAvatarUrl(user.profile_photo) ? (
                        <img src={formatAvatarUrl(user.profile_photo)} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider">
                        {user.display_name || user.username}
                      </p>
                      <p className="font-mono text-[10px] opacity-60">@{user.username} • {user.area || 'SALIGRAMAM'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </div>
              ))
            ) : (
              <div className="p-4 font-mono text-xs text-white/50 text-center uppercase tracking-widest">
                NO_OPERATORS_FOUND
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
