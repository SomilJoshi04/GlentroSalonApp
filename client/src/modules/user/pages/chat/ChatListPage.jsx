import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats } from '../../services/userApi';
import Loader from '../../../../components/common/Loader';
import PageHeader from '../../../../components/common/PageHeader';

const ChatListPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadChats(); }, []);

  const loadChats = async () => {
    try { const res = await getChats(); setChats(res.data.data); } catch (e) {}
    setLoading(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 animate-fade-in w-full">
      <PageHeader title="Messages" />
      <h1 className="hidden md:block font-headline-xl text-[32px] font-bold text-on-surface">Messages</h1>
      {chats.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-on-surface">No conversations yet</h3>
          <p className="text-text-secondary text-sm mt-1">Start a chat from a salon or booking page</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map(chat => (
            <div key={chat._id} onClick={() => navigate(`/chat/${chat._id}`)}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-200 to-accent-200 rounded-full flex items-center justify-center text-xl flex-shrink-0">💬</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-text-primary truncate">Chat #{chat._id.slice(-6)}</h4>
                <p className="text-sm text-text-muted truncate">{chat.lastMessage?.content || 'No messages yet'}</p>
              </div>
              {chat.lastMessage?.timestamp && (
                <span className="text-xs text-text-muted flex-shrink-0">
                  {new Date(chat.lastMessage.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatListPage;
