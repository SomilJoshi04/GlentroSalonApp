import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats } from '../../services/userApi';
import { useSocket } from '../../../../context/SocketContext';
import Loader from '../../../../components/common/Loader';
import PageHeader from '../../../../components/common/PageHeader';

const ChatListPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => { 
    loadChats(); 
    
    if (socket) {
      socket.on('chat:message', loadChats);
      return () => {
        socket.off('chat:message', loadChats);
      };
    }
  }, [socket]);

  const loadChats = async () => {
    try { const res = await getChats(); setChats(res.data.data); } catch (e) {}
    setLoading(false);
  };

  if (loading) return <Loader />;

  const filteredChats = chats.filter(chat => {
    const isAdminChat = chat.chatType === 'user-admin';
    const otherParticipant = chat.participants.find(p => p.role === (isAdminChat ? 'admin' : 'vendor'));
    const vendorName = isAdminChat ? 'Admin Support' : (otherParticipant?.vendorDetails?.name || 'Vendor');
    const salonName = chat.salonDetails?.name || '';
    const displayId = chat.chatDisplayId || `CHAT-${chat._id.slice(-6).toUpperCase()}`;
    const q = searchQuery.toLowerCase();
    
    return salonName.toLowerCase().includes(q) || 
           vendorName.toLowerCase().includes(q) ||
           displayId.toLowerCase().includes(q) ||
           (chat.lastMessage?.content && chat.lastMessage.content.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 animate-fade-in w-full">
      <PageHeader title="Messages" />
      <h1 className="hidden md:block font-headline-xl text-[32px] font-bold text-on-surface">Messages</h1>
      
      {chats.length > 0 && (
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">search</span>
          <input 
            type="text" 
            placeholder="Search chats by salon name, ID or message..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface rounded-2xl border border-gray-100 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm text-text-primary transition-all"
          />
        </div>
      )}

      {chats.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border flex flex-col items-center">
          <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">chat</span>
          <h3 className="text-lg font-semibold text-on-surface">No conversations yet</h3>
          <p className="text-text-secondary text-sm mt-1">Start a chat from a salon or booking page</p>
        </div>
      ) : filteredChats.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-gray-100 flex flex-col items-center">
          <span className="material-symbols-outlined text-4xl text-text-muted/30 mb-2">search_off</span>
          <h3 className="text-lg font-semibold text-text-primary">No chats found</h3>
          <p className="text-text-secondary text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredChats.map(chat => {
            const isAdminChat = chat.chatType === 'user-admin';
            const otherParticipant = chat.participants.find(p => p.role === (isAdminChat ? 'admin' : 'vendor'));
            const vendorName = isAdminChat ? 'Admin Support' : (otherParticipant?.vendorDetails?.name || 'Vendor');
            const displayId = chat.chatDisplayId || `CHAT-${chat._id.slice(-6).toUpperCase()}`;
            return (
              <div key={chat._id} onClick={() => navigate(`/chat/${chat._id}`)}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-200 to-accent-200 rounded-full flex items-center justify-center text-xl flex-shrink-0 font-bold text-primary-700">
                  {vendorName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-text-primary truncate">{vendorName}</h4>
                  {chat.salonDetails && (
                    <p className="text-xs text-primary-600 font-medium mt-0.5 truncate">{chat.salonDetails.name}</p>
                  )}
                  <p className="text-xs text-text-muted mt-0.5">{displayId}</p>
                  <p className="text-sm text-text-secondary truncate mt-1">{chat.lastMessage?.content || 'No messages yet'}</p>
                </div>
                {chat.lastMessage?.timestamp && (
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {new Date(chat.lastMessage.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatListPage;
