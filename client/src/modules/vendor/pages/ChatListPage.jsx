import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats } from '../services/vendorApi';
import { useSocket } from '../../../context/SocketContext';

const ChatListPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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

  // Reset to first page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadChats = async () => {
    try { const res = await getChats(); setChats(res.data.data); } catch (e) {}
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1,2].map(i => (
             <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto w-full pb-10">
      <div>
        <h1 className="font-headline-md text-[28px] text-on-surface font-bold">Chats</h1>
        <p className="font-body-md text-muted-text mt-1">Communicate with your salon customers in real-time.</p>
      </div>

      {chats.length > 0 && (
        <div className="relative mb-2">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-text">search</span>
          <input 
            type="text" 
            placeholder="Search chats by customer name, ID or message..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface rounded-2xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-on-surface transition-all"
          />
        </div>
      )}

      {chats.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border flex flex-col items-center">
          <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">chat</span>
          <h3 className="text-lg font-semibold text-on-surface">No conversations yet</h3>
          <p className="text-muted-text text-sm mt-1">Customers will appear here when they message your salons.</p>
        </div>
      ) : (() => {
        const filteredChats = chats.filter(chat => {
          const otherParticipant = chat.participants.find(p => p.role === 'user');
          const customerName = otherParticipant?.userDetails?.name || 'Customer';
          const salonName = chat.salonDetails?.name || '';
          const displayId = chat.chatDisplayId || `CHAT-${chat._id.slice(-6).toUpperCase()}`;
          const q = searchQuery.toLowerCase();
          
          return customerName.toLowerCase().includes(q) || 
                 salonName.toLowerCase().includes(q) ||
                 displayId.toLowerCase().includes(q) ||
                 (chat.lastMessage?.content && chat.lastMessage.content.toLowerCase().includes(q));
        });

        if (filteredChats.length === 0) {
          return (
            <div className="text-center py-12 bg-surface rounded-2xl border border-border flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">search_off</span>
              <h3 className="text-lg font-semibold text-on-surface">No chats found</h3>
              <p className="text-muted-text text-sm mt-1">Try a different search term</p>
            </div>
          );
        }

        const chatsPerPage = 10;
        const totalPages = Math.ceil(filteredChats.length / chatsPerPage);
        const paginatedChats = filteredChats.slice((currentPage - 1) * chatsPerPage, currentPage * chatsPerPage);

        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {paginatedChats.map(chat => {
              const otherParticipant = chat.participants.find(p => p.role === 'user');
              const customerName = otherParticipant?.userDetails?.name || 'Customer';
            const displayId = chat.chatDisplayId || `CHAT-${chat._id.slice(-6).toUpperCase()}`;
            return (
              <div key={chat._id} onClick={() => navigate(`/vendor/chat/${chat._id}`)}
                className="flex items-center gap-4 p-5 bg-surface rounded-2xl border border-border hover:shadow-md transition-all cursor-pointer shadow-sm">
                <div className="w-12 h-12 bg-soft-primary rounded-full flex items-center justify-center text-xl text-primary flex-shrink-0 shadow-sm font-bold border border-primary/10">
                  {customerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-on-surface truncate">{customerName}</h4>
                  {chat.salonDetails && (
                    <p className="text-xs text-primary font-medium mt-0.5 truncate">{chat.salonDetails.name}</p>
                  )}
                  <p className="text-xs text-muted-text mt-0.5">{displayId}</p>
                  <p className="text-sm text-muted-text truncate mt-1">{chat.lastMessage?.content || 'No messages yet'}</p>
                </div>
                {chat.lastMessage?.timestamp && (
                  <span className="text-xs font-medium text-muted-text flex-shrink-0">
                    {new Date(chat.lastMessage.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-4 py-3 bg-surface border border-border rounded-xl shadow-sm">
            <span className="text-sm text-muted-text font-medium">
              Showing {(currentPage - 1) * chatsPerPage + 1} to {Math.min(currentPage * chatsPerPage, filteredChats.length)} of {filteredChats.length} chats
            </span>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm font-semibold text-on-surface rounded-lg border border-border disabled:opacity-50 disabled:bg-surface-variant hover:bg-surface-variant transition-colors flex items-center"
              >
                Previous
              </button>
              
              <div className="flex gap-1 hidden sm:flex">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === i + 1 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'border border-border text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-sm font-semibold text-on-surface rounded-lg border border-border disabled:opacity-50 disabled:bg-surface-variant hover:bg-surface-variant transition-colors flex items-center"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
        );
      })()}
    </div>
  );
};

export default ChatListPage;
