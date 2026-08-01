'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, Video, Info, MessageSquareDashed, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

const decodeMessageText = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  try {
    if (text.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(text)) {
      const decoded = atob(text);
      if (decoded && /^[\x20-\x7E\s\r\n\t]+$/.test(decoded)) {
        return decoded;
      }
    }
  } catch (e) {}
  return text;
};

const formatMessageTime = (raw) => {
  if (!raw) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  try {
    let d;
    if (typeof raw === 'number') {
      if (raw > 1e14) d = new Date(raw / 1e6); // nanoseconds to ms
      else if (raw > 1e11) d = new Date(raw); // ms
      else d = new Date(raw * 1000); // seconds
    } else {
      let str = String(raw).trim();
      if (str.includes('T') && !str.endsWith('Z') && !/\+[0-9]{2}:?[0-9]{2}$/.test(str) && !/-[0-9]{2}:?[0-9]{2}$/.test(str)) {
        str += 'Z';
      }
      d = new Date(str);
    }
    if (isNaN(d.getTime())) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

const ChatSection = ({ currentUser: propUser }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [connections, setConnections] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const activeChatRef = useRef(activeChat);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // 1. Load Current User
  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
    } else if (typeof window !== 'undefined') {
      fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setCurrentUser(data);
        })
        .catch((err) => console.error('Error loading user:', err));
    }
  }, [propUser]);

  // 2. Fetch Connections List
  useEffect(() => {
    fetchAcceptedConnections();
  }, []);

  const fetchAcceptedConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/connections/list`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setConnections(data);
        if (data.length > 0) {
          handleSelectChat(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Resilient Real-Time WebSocket Handler
  const connectWebSocket = useCallback(() => {
    const userId = currentUser?.user_id || currentUser?.id;
    if (!userId) return;

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = `${WS_BASE_URL}/ws/chat/${userId}`;
    console.log('[WEBSOCKET_DEBUG] Connecting:', wsUrl);

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ [WEBSOCKET_CONNECTED]');
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 [WEBSOCKET_MSG]', data);

        if (data.type === 'ping' || data.type === 'pong' || data.type === 'message_ack') return;

        const currentUserId = String(currentUser?.user_id || currentUser?.id || '');
        const incomingSenderId = String(data.sender_id || '');
        const incomingReceiverId = String(data.receiver_id || '');
        const currentActive = activeChatRef.current;

        if (!currentActive) return;

        const activeOtherId = String(currentActive.other_user_id || '').toLowerCase();
        const isSenderMatch = activeOtherId === incomingSenderId.toLowerCase();
        const isReceiverMatch = activeOtherId === incomingReceiverId.toLowerCase();

        if (isSenderMatch || isReceiverMatch) {
          const isMe = incomingSenderId.toLowerCase() === currentUserId.toLowerCase();
          const rawText = data.content || data.text || '';
          const decodedText = decodeMessageText(rawText);
          const timeFormatted = formatMessageTime(data.created_at);

          setChatHistory((prev) => {
            const isDuplicate = prev.some(
              (m) =>
                (m.id && data.message_id && String(m.id) === String(data.message_id)) ||
                (m.text === decodedText && String(m.sender_id || '').toLowerCase() === incomingSenderId.toLowerCase())
            );

            if (isDuplicate) return prev;

            return [
              ...prev,
              {
                id: data.message_id || Date.now(),
                sender: isMe ? 'me' : 'other',
                text: decodedText,
                time: timeFormatted,
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
              },
            ];
          });
        }
      } catch (err) {
        console.error('[WEBSOCKET_RECEIVE_ERROR]', err);
      }
    };

    ws.onerror = () => {
      // Quietly handle connection errors when backend is offline or restarting
    };

    ws.onclose = (evt) => {
      if (evt.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    };
  }, [currentUser?.user_id, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.user_id || currentUser?.id) {
      connectWebSocket();
    }
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close(1000, 'Unmounted');
    };
  }, [currentUser, connectWebSocket]);

  // 4. Load Chat History
  const handleSelectChat = async (conn) => {
    setActiveChat(conn);
    setChatHistory([
      { id: 'sys-init', sender: 'system', text: `ENCRYPTED SESSION INITIALIZED WITH @${conn.other_username}`, time: 'SYSTEM' },
    ]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/history/${conn.other_user_id}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const historyData = await res.json();
        const currentUserId = String(currentUser?.user_id || currentUser?.id || '');

        const formattedHistory = historyData
          .map((msg) => {
            const isMe = String(msg.sender_id || '').toLowerCase() === currentUserId.toLowerCase();
            return {
              id: msg.message_id,
              sender: isMe ? 'me' : 'other',
              text: decodeMessageText(msg.content),
              rawTime: msg.created_at,
              time: formatMessageTime(msg.created_at),
              sender_id: msg.sender_id,
              receiver_id: msg.receiver_id,
            };
          })
          .sort((a, b) => {
            const tA = a.rawTime ? new Date(a.rawTime).getTime() : 0;
            const tB = b.rawTime ? new Date(b.rawTime).getTime() : 0;
            return tA - tB;
          });

        setChatHistory([
          { id: 'sys-init', sender: 'system', text: `ENCRYPTED SESSION INITIALIZED WITH @${conn.other_username}`, time: 'SYSTEM' },
          ...formattedHistory,
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // 5. Send Message (WhatsApp Style: Sender on Right, Receiver on Left, Bottom Appended)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChat) return;

    const currentUserId = currentUser?.user_id || currentUser?.id;
    const textToSend = msgInput.trim();
    const nowTime = formatMessageTime(new Date().toISOString());

    setMsgInput('');

    // Append sender message immediately to bottom of UI
    const tempId = Date.now();
    setChatHistory((prev) => [
      ...prev,
      {
        id: tempId,
        sender: 'me',
        text: textToSend,
        time: nowTime,
        sender_id: currentUserId,
        receiver_id: activeChat.other_user_id,
      },
    ]);

    const payload = {
      type: 'chat_message',
      sender_id: currentUserId,
      receiver_id: activeChat.other_user_id,
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else {
      try {
        await fetch(`${API_BASE_URL}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('HTTP send failed:', err);
      }
      connectWebSocket();
    }
  };

  const formatAvatarUrl = (photoPath) => {
    if (!photoPath || photoPath === 'skipped') return null;
    if (photoPath.startsWith('http') || photoPath.startsWith('data:')) return photoPath;
    return `${API_BASE_URL}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center font-mono text-white text-xs">
        LOADING_ENCRYPTED_COMMS_CHANNELS...
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="brutalist-panel p-8 max-w-md w-full bg-black border-2 border-white space-y-4">
          <MessageSquareDashed className="w-12 h-12 text-white/40 mx-auto" />
          <h2 className="font-mono text-lg font-bold text-white uppercase">NO_ACTIVE_CHATS</h2>
          <p className="font-mono text-xs text-white/60 uppercase leading-relaxed">
            NO_ESTABLISHED_OPERATIONAL_CONNECTIONS._CONNECT_WITH_USERS_ON_RADAR_MAP_TO_INITIATE_ENCRYPTED_COMMS.
          </p>
          <button
            onClick={() => router.push('/')}
            className="brutalist-button py-3 px-6 w-full font-mono text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> FIND_OPERATORS_ON_MAP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-black text-white relative z-10 overflow-hidden">
      {/* Sidebar: Connections List */}
      <div className="w-full md:w-80 border-r-2 border-white flex flex-col bg-black shrink-0 h-48 md:h-full overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b-2 border-white bg-black sticky top-0 z-10">
          <h3 className="font-mono text-xs font-black tracking-widest text-white uppercase flex items-center justify-between">
            <span>[+] ACTIVE_CHANNELS</span>
            <span className="bg-white text-black px-1.5 py-0.5 text-[10px]">
              {connections.length}
            </span>
          </h3>
        </div>

        <div className="divide-y divide-white/20">
          {connections.map((conn) => {
            const isSelected = activeChat?.other_user_id === conn.other_user_id;
            const avatarUrl = formatAvatarUrl(conn.other_profile_photo);

            return (
              <div
                key={conn.connection_id}
                onClick={() => handleSelectChat(conn)}
                className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-white'
                }`}
              >
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black font-mono text-sm overflow-hidden border border-white shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={conn.other_username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    conn.other_username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-mono text-sm truncate uppercase font-bold">
                      {conn.other_display_name || conn.other_username}
                    </h4>
                  </div>
                  <p className={`font-mono text-[10px] truncate uppercase ${isSelected ? 'text-black/70' : 'text-emerald-400'}`}>
                    @{conn.other_username} &bull; ACTIVE
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat View */}
      {activeChat && (
        <div className="flex-1 flex flex-col h-full bg-black relative min-w-0">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b-2 border-white flex justify-between items-center bg-black shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white text-black flex items-center justify-center font-black font-mono text-sm overflow-hidden border border-white">
                {formatAvatarUrl(activeChat.other_profile_photo) ? (
                  <img
                    src={formatAvatarUrl(activeChat.other_profile_photo)}
                    alt={activeChat.other_username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  activeChat.other_username.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-white font-black tracking-widest text-sm">
                  {activeChat.other_display_name || activeChat.other_username}
                </h4>
                <p className="text-[10px] font-mono text-emerald-400 uppercase">
                  STATUS: CONNECTED (@{activeChat.other_username})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/60">
              <Phone className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
              <Video className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
              <Info className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Messages Container: WhatsApp Style Layout */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3 bg-black">
            {chatHistory.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="font-mono text-[10px] text-white/40 border border-white/20 px-3 py-1 uppercase">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isMe = msg.sender === 'me';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] border-2 p-3 ${
                      isMe ? 'bg-white text-black border-white' : 'bg-black text-white border-white'
                    }`}
                  >
                    <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p
                      className={`text-[10px] mt-2 font-mono font-bold border-t pt-1 ${
                        isMe ? 'border-black/20 text-black/50' : 'border-white/20 text-white/40'
                      }`}
                    >
                      TS:&nbsp;{msg.time}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-black border-t-2 border-white shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="> INPUT_MESSAGE_"
                className="flex-1 bg-black border-2 border-white px-4 py-3 text-white font-mono text-sm placeholder-white/25 focus:outline-none focus:border-emerald-400 uppercase transition-colors"
              />
              <button type="submit" className="brutalist-button px-4 cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSection;