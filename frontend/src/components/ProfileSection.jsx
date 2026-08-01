'use client';

import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Edit2, 
  LogOut, 
  Check, 
  Terminal, 
  UserCheck, 
  UserX, 
  Users, 
  Clock, 
  ChevronRight, 
  Upload, 
  X, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Loader2,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AREAS = [
  'SALIGRAMAM_SEC',
  'PORUR_SEC',
  'MADIPAKKAM_SEC',
  'CHENNAI_CENTRAL',
  'VELACHERY_SEC',
  'ADYAR_SEC',
];

const ProfileSection = ({ username, avatar }) => {
  const router = useRouter();
  
  // Profile Data State
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editArea, setEditArea] = useState(AREAS[0]);
  const [editPhone, setEditPhone] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editInterests, setEditInterests] = useState('');
  const [editProfilePhoto, setEditProfilePhoto] = useState('');
  const [editBannerPhoto, setEditBannerPhoto] = useState('');

  // Upload & Save status states
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Network Connections
  const [pendingRequests, setPendingRequests] = useState([]);
  const [connectionsList, setConnectionsList] = useState([]);

  useEffect(() => {
    // Check local storage for quick initial render
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('ucw_current_user') : null;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setProfileData(parsed);
        populateFormFields(parsed);
      } catch (e) {}
    }
    fetchProfileAndNetwork();
  }, [username]);

  const fetchProfileAndNetwork = async () => {
    setLoadingProfile(true);
    try {
      // 1. Fetch current logged-in user profile directly from DB
      const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
      if (meRes.ok) {
        const meData = await meRes.json();
        setProfileData(meData);
        populateFormFields(meData);
      }

      // 2. Fetch pending connection requests
      const pendingRes = await fetch(`${API_BASE_URL}/api/connections/pending`, { credentials: 'include' });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingRequests(pendingData);
      }

      // 3. Fetch accepted connections
      const listRes = await fetch(`${API_BASE_URL}/api/connections/list`, { credentials: 'include' });
      if (listRes.ok) {
        const listData = await listRes.json();
        setConnectionsList(listData);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const populateFormFields = (data) => {
    if (!data) return;
    setEditDisplayName(data.display_name || '');
    setEditBio(data.bio || '');
    setEditArea(data.area || AREAS[0]);
    setEditPhone(data.phone_number || '');
    setEditSkills(data.skills || '');
    setEditInterests(data.interests || '');
    setEditProfilePhoto(data.profile_photo || '');
    setEditBannerPhoto(data.banner_photo || '');
  };

  // Helper to format Image URLs (handling relative /uploads/ paths)
  const formatImageUrl = (url) => {
    if (!url || url === 'skipped') return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Handle File Upload ONLY (No text URL)
  const handleFileUpload = async (file, type) => {
    if (!file) return;
    if (type === 'profile') setUploadingProfile(true);
    if (type === 'banner') setUploadingBanner(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/upload/image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (type === 'profile') {
          setEditProfilePhoto(data.url);
        } else if (type === 'banner') {
          setEditBannerPhoto(data.url);
        }
      } else {
        const errJson = await res.json();
        alert(`Upload failed: ${errJson.detail || 'Error uploading file'}`);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Error uploading file to server');
    } finally {
      if (type === 'profile') setUploadingProfile(false);
      if (type === 'banner') setUploadingBanner(false);
    }
  };

  // Save Profile to PostgreSQL
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        display_name: editDisplayName,
        bio: editBio,
        area: editArea,
        phone_number: editPhone,
        skills: editSkills,
        interests: editInterests,
        profile_photo: editProfilePhoto,
        banner_photo: editBannerPhoto,
      };

      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setProfileData(updatedUser);

        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errData = await res.json();
        setSaveError(errData.detail || 'Failed to update profile');
      }
    } catch (err) {
      setSaveError('Network error while saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async (connectionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/connections/action?action=accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ connection_id: connectionId }),
      });

      if (res.ok) fetchProfileAndNetwork();
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleReject = async (connectionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/connections/action?action=reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ connection_id: connectionId }),
      });

      if (res.ok) fetchProfileAndNetwork();
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const handleShareId = () => {
    const activeUsername = profileData?.username || username;
    navigator.clipboard.writeText(`ucw.app/user/${activeUsername}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeAvatarUrl = formatImageUrl(profileData?.profile_photo || avatar);
  const activeBannerUrl = formatImageUrl(profileData?.banner_photo);
  const activeUsername = profileData?.username || username || 'OPERATOR';
  const activeDisplayName = profileData?.display_name || activeUsername;
  const skillsList = profileData?.skills ? profileData.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const interestsList = profileData?.interests ? profileData.interests.split(',').map((i) => i.trim()).filter(Boolean) : [];

  return (
    <div className="w-full h-full p-4 overflow-y-auto pb-24 custom-scrollbar">
      <div className="max-w-xl mx-auto space-y-6">

        {saveSuccess && (
          <div className="p-3 bg-emerald-950 border border-emerald-500 text-emerald-400 font-mono text-xs uppercase flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" /> PROFILE_DATA_UPDATED_IN_DATABASE
            </span>
          </div>
        )}

        {/* ─── Profile Card with Banner Header ───────────────────── */}
        <div className="bg-black text-white border-2 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] overflow-hidden relative">
          
          {/* Banner Image Container */}
          <div className="h-36 w-full bg-gradient-to-r from-emerald-950 via-black to-blue-950 relative border-b-2 border-white overflow-hidden">
            {activeBannerUrl ? (
              <img src={activeBannerUrl} alt="Profile Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-between p-4 opacity-20">
                <Terminal className="w-20 h-20 text-white" />
                <span className="font-mono text-[10px] tracking-widest uppercase">// NO_BANNER_SET</span>
              </div>
            )}

            <button
              onClick={() => {
                populateFormFields(profileData);
                setIsEditing(true);
              }}
              className="absolute top-3 right-3 px-3 py-1.5 bg-black/80 hover:bg-white hover:text-black border border-white text-white font-mono text-xs uppercase font-bold flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>EDIT_PROFILE</span>
            </button>
          </div>

          {/* Profile Header Info */}
          <div className="p-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 mb-4">
              
              {/* Profile Avatar */}
              <div className="w-24 h-24 bg-black text-white flex items-center justify-center overflow-hidden font-black font-mono text-3xl border-4 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] shrink-0 select-none">
                {activeAvatarUrl ? (
                  <img src={activeAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  activeUsername.substring(0, 2).toUpperCase()
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-widest">
                  ● ONLINE_OPERATOR
                </span>
              </div>
            </div>

            <div className="border-b-2 border-white/20 pb-4 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-1">
                &gt;&nbsp;OPERATOR_NAME
              </p>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white glitch" data-text={activeDisplayName.toUpperCase()}>
                {activeDisplayName.toUpperCase()}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 font-mono text-xs text-white/60">
                <span className="text-emerald-400 font-bold">@{activeUsername}</span>
                {profileData?.area && (
                  <span className="flex items-center gap-1 text-white/80">
                    <MapPin className="w-3 h-3 text-white/50" /> {profileData.area}
                  </span>
                )}
                {profileData?.phone_number && (
                  <span className="flex items-center gap-1 text-white/80">
                    <Phone className="w-3 h-3 text-white/50" /> {profileData.phone_number}
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">&gt;&nbsp;BIO_DATA</p>
              <p className="font-mono text-sm text-white/90 leading-relaxed bg-white/5 p-3 border border-white/10">
                {profileData?.bio || 'No bio set. Click [EDIT_PROFILE] to add your bio.'}
              </p>
            </div>

            {/* Skills Badges */}
            {skillsList.length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> SKILLS
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skillsList.map((sk, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-black border border-white/40 text-white font-mono text-xs uppercase">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Interests Badges */}
            {interestsList.length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" /> INTERESTS
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {interestsList.map((intr, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-blue-950/40 border border-blue-500/50 text-blue-300 font-mono text-xs uppercase">
                      {intr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between font-mono text-xs text-white/60 uppercase pt-2">
              <span>ID: <strong className="text-white">UCW_{activeUsername.toUpperCase()}</strong></span>
              <button
                onClick={() => router.push(`/user/${activeUsername}`)}
                className="text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                [ View Public Profile ]
              </button>
            </div>
          </div>
        </div>

        {/* ─── Pending Connection Requests ───────────────────── */}
        {pendingRequests.length > 0 && (
          <div className="brutalist-panel p-5 border-2 border-amber-400 bg-amber-950/20">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-amber-400/40">
              <h3 className="font-black text-amber-400 tracking-widest uppercase text-xs font-mono flex items-center gap-2">
                <Clock className="w-4 h-4" />
                PENDING_REQUESTS ({pendingRequests.length})
              </h3>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.connection_id} className="p-3 bg-black border border-white/20 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-white uppercase">{req.other_display_name || req.other_username}</p>
                    <p className="font-mono text-[10px] text-white/50">@{req.other_username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAccept(req.connection_id)}
                      className="p-2 bg-emerald-500 text-black hover:bg-white transition-colors border border-emerald-500 cursor-pointer"
                      title="Accept Connection"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(req.connection_id)}
                      className="p-2 bg-red-950 text-red-400 hover:bg-red-500 hover:text-black transition-colors border border-red-500 cursor-pointer"
                      title="Reject Connection"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Connections List ───────────────────── */}
        <div className="brutalist-panel p-5">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/20">
            <h3 className="font-black text-white tracking-widest uppercase text-xs font-mono flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              CONNECTED_OPERATORS ({connectionsList.length})
            </h3>
          </div>
          {connectionsList.length > 0 ? (
            <div className="space-y-2">
              {connectionsList.map((conn) => (
                <div
                  key={conn.connection_id}
                  onClick={() => router.push(`/user/${conn.other_username}`)}
                  className="p-3 bg-white/5 hover:bg-white hover:text-black transition-all border border-white/20 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 group-hover:bg-black group-hover:text-white flex items-center justify-center font-mono text-xs font-bold border border-white/40">
                      {conn.other_username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase">{conn.other_display_name || conn.other_username}</p>
                      <p className="font-mono text-[10px] opacity-60">@{conn.other_username}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-white/50 uppercase tracking-widest text-center py-4">
              NO_ACTIVE_CONNECTIONS. USE SEARCH BAR TO CONNECT.
            </p>
          )}
        </div>

        {/* ─── Actions ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleShareId}
            className="brutalist-button flex flex-col items-center justify-center gap-2 py-5 cursor-pointer"
          >
            {copied
              ? <Check className="w-6 h-6 text-emerald-400" />
              : <Share2 className="w-6 h-6" />}
            <span className="text-[10px] font-black">
              {copied ? 'COPIED_!' : 'SHARE_ID'}
            </span>
          </button>
          <button
            onClick={async () => {
              try {
                await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
              } catch (e) {}
              router.push('/login');
            }}
            className="border-2 border-secondary bg-black text-secondary font-bold uppercase
                       tracking-widest flex flex-col items-center justify-center gap-2 py-5
                       hover:bg-secondary hover:text-black transition-all cursor-pointer
                       shadow-[4px_4px_0px_0px_rgba(255,0,60,1)]
                       hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-black">TERMINATE</span>
          </button>
        </div>

      </div>

      {/* ─── EDIT PROFILE MODAL ────────────────────────────────────── */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-black border-2 border-white p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[10px_10px_0px_0px_rgba(255,255,255,1)] relative my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-white pb-4 mb-4 shrink-0">
              <h3 className="font-black text-xl text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" /> EDIT_OPERATOR_PROFILE
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-white hover:bg-white hover:text-black transition-colors cursor-pointer border border-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {saveError && (
              <div className="p-3 mb-4 bg-red-950 border border-red-500 text-red-400 font-mono text-xs uppercase shrink-0">
                ERR: {saveError}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProfile} className="flex-1 flex flex-col overflow-hidden font-mono text-xs">
              <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar pb-4">
                
                {/* Image Uploads Grid (Side-by-side on larger screens) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Profile Picture Upload */}
                  <div className="space-y-2 border-2 border-white/20 p-4 bg-white/5 flex flex-col justify-between">
                    <label className="block text-white/90 font-bold uppercase tracking-wider">
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-black border-2 border-white flex items-center justify-center overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                        {editProfilePhoto ? (
                          <img src={formatImageUrl(editProfilePhoto)} alt="Profile Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-6 h-6 text-white/40" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          id="profile-photo-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files?.[0], 'profile')}
                        />
                        <label
                          htmlFor="profile-photo-input"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-white text-black font-bold uppercase text-[11px] tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer border border-white w-full justify-center"
                        >
                          {uploadingProfile ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> UPLOADING...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" /> CHOOSE FILE
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 2. Banner Picture Upload */}
                  <div className="space-y-2 border-2 border-white/20 p-4 bg-white/5 flex flex-col justify-between">
                    <label className="block text-white/90 font-bold uppercase tracking-wider">
                      Banner Picture
                    </label>
                    <div className="space-y-2">
                      <div className="h-14 w-full bg-black border border-white overflow-hidden flex items-center justify-center">
                        {editBannerPhoto ? (
                          <img src={formatImageUrl(editBannerPhoto)} alt="Banner Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 text-white/40">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[10px] uppercase">No banner set</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        id="banner-photo-input"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files?.[0], 'banner')}
                      />
                      <label
                        htmlFor="banner-photo-input"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white text-black font-bold uppercase text-[11px] tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer border border-white w-full justify-center"
                      >
                        {uploadingBanner ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> UPLOADING...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" /> CHOOSE BANNER FILE
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Display Name & Area Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 font-bold uppercase mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      className="w-full bg-black border-2 border-white text-white p-3 uppercase focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-bold uppercase mb-1.5">Area / Sector</label>
                    <select
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      className="w-full bg-black border-2 border-white text-white p-3 uppercase focus:border-emerald-400 focus:outline-none cursor-pointer"
                    >
                      {AREAS.map((areaChoice) => (
                        <option key={areaChoice} value={areaChoice} className="bg-black text-white">
                          {areaChoice}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Operator Bio */}
                <div>
                  <label className="block text-white/80 font-bold uppercase mb-1.5">Operator Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Describe your background and ethos..."
                    rows={3}
                    className="w-full bg-black border-2 border-white text-white p-3 uppercase focus:border-emerald-400 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* 5. Skills & Interests Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 font-bold uppercase mb-1.5">Skills (Comma Separated)</label>
                    <input
                      type="text"
                      value={editSkills}
                      onChange={(e) => setEditSkills(e.target.value)}
                      placeholder="React, Python, PostgreSQL, FastAPI"
                      className="w-full bg-black border-2 border-white text-white p-3 uppercase focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-bold uppercase mb-1.5">Interests (Comma Separated)</label>
                    <input
                      type="text"
                      value={editInterests}
                      onChange={(e) => setEditInterests(e.target.value)}
                      placeholder="Web Development, Cyber Security"
                      className="w-full bg-black border-2 border-white text-white p-3 uppercase focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 6. Phone Number */}
                <div>
                  <label className="block text-white/80 font-bold uppercase mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-black border-2 border-white text-white p-3 uppercase focus:border-emerald-400 focus:outline-none"
                  />
                </div>

              </div>

              {/* Fixed Bottom Modal Action Footer */}
              <div className="flex items-center justify-end gap-4 pt-4 mt-2 border-t-2 border-white shrink-0 bg-black">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 border-2 border-white/50 text-white hover:bg-white hover:text-black uppercase font-bold tracking-wider transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingProfile || uploadingBanner}
                  className="px-7 py-2.5 bg-emerald-500 text-black font-extrabold uppercase tracking-wider hover:bg-white transition-colors border-2 border-emerald-500 flex items-center gap-2 cursor-pointer shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> SAVING...
                    </>
                  ) : (
                    'SAVE_PROFILE'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileSection;
