import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats } from '../services/adminApi';
import { useSocket } from '../../../context/SocketContext';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import AdminListToolbar from '../components/layout/AdminListToolbar';

const SupportPage = () => {
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1,2,3].map(i => (
             <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
          ))}
        </div>
      </div>
    );
  }


  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Support & Tickets"
        description="Manage vendor and customer support requests."
      />

      <AdminListToolbar 
        searchPlaceholder="Search tickets by user name, ID or message..."
        onSearch={setSearchQuery}
        searchValue={searchQuery}
      />

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4">
        {chats.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center shadow-sm h-full">
            <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mb-4 text-muted-text">
              <span className="material-symbols-outlined text-[32px]">headset_mic</span>
            </div>
            <h3 className="font-headline-sm text-[18px] text-on-surface mb-2">No Support Tickets</h3>
            <p className="font-body-sm text-muted-text max-w-md">
              There are currently no open support tickets. All issues have been resolved.
            </p>
          </div>
        ) : (() => {
          const filteredChats = chats.filter(chat => {
            const otherParticipant = chat.participants.find(p => p.role === 'user' || p.role === 'vendor');
            const participantName = otherParticipant?.userDetails?.name || otherParticipant?.vendorDetails?.name || 'User';
            const displayId = chat.chatDisplayId || `CHAT-${chat._id.slice(-6).toUpperCase()}`;
            const q = searchQuery.toLowerCase();
            
            return participantName.toLowerCase().includes(q) || 
                   displayId.toLowerCase().includes(q) ||
                   (chat.lastMessage?.content && chat.lastMessage.content.toLowerCase().includes(q));
          });

          if (filteredChats.length === 0) {
            return (
              <div className="text-center py-12 bg-surface rounded-2xl border border-border flex flex-col items-center shadow-sm">
                <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">search_off</span>
                <h3 className="text-lg font-semibold text-on-surface">No tickets found</h3>
                <p className="text-muted-text text-sm mt-1">Try a different search term</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChats.map(chat => {
                const otherParticipant = chat.participants.find(p => p.role === 'user' || p.role === 'vendor');
                const participantName = otherParticipant?.userDetails?.name || otherParticipant?.vendorDetails?.name || 'User';
                const displayId = chat.chatDisplayId || `CHAT-${chat._id.slice(-6).toUpperCase()}`;
                return (
                  <div key={chat._id} onClick={() => navigate(`/admin/support/${chat._id}`)}
                    className="flex items-center gap-4 p-5 bg-surface rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer shadow-sm group">
                    <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center text-xl text-muted-text flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors font-bold border border-border group-hover:border-primary/20">
                      {participantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-on-surface truncate">{participantName}</h4>
                      <p className="text-[12px] text-primary font-medium mt-0.5">{displayId}</p>
                      <p className="text-[14px] text-muted-text truncate mt-1">{chat.lastMessage?.content || 'No messages yet'}</p>
                    </div>
                    {chat.lastMessage?.timestamp && (
                      <span className="text-[11px] font-medium text-muted-text flex-shrink-0 self-start mt-1">
                        {new Date(chat.lastMessage.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </AdminPageLayout>
  );
};

export default SupportPage;
