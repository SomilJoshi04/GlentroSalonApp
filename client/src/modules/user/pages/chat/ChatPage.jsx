import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getMessages, sendMessage as sendMessageApi, markChatAsRead } from '../../services/userApi';
import { useSocket } from '../../../../context/SocketContext';
import { useAuth } from '../../../../context/AuthContext';
import Button from '../../../../components/common/Button';
import Loader from '../../../../components/common/Loader';

const ChatPage = () => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    loadMessages();
    if (socket) {
      socket.emit('chat:join', chatId);
      socket.on('chat:message', handleIncomingMessage);
      socket.on('chat:typing', handleTyping);
      markChatAsRead(chatId);
      return () => {
        socket.emit('chat:leave', chatId);
        socket.off('chat:message', handleIncomingMessage);
        socket.off('chat:typing', handleTyping);
      };
    }
  }, [chatId, socket]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadMessages = async () => {
    try { const res = await getMessages(chatId); setMessages(res.data.data.messages.reverse()); } catch (e) {}
    setLoading(false);
  };

  const handleIncomingMessage = (data) => {
    if (data.chatId === chatId) {
      setMessages(prev => [...prev, data]);
      setIsTyping(false);
    }
  };

  const handleTyping = (data) => {
    if (data.userId !== user._id) setIsTyping(data.isTyping);
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await sendMessageApi(chatId, { content: newMessage.trim(), messageType: 'text' });
      setMessages(prev => [...prev, res.data.data]);
      socket?.emit('chat:message', { chatId, content: newMessage.trim(), messageType: 'text' });
      socket?.emit('chat:stop-typing', { chatId });
      setNewMessage('');
    } catch (e) {}
    setSending(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    socket?.emit('chat:typing', { chatId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { socket?.emit('chat:stop-typing', { chatId }); }, 2000);
  };

  if (loading) return <Loader />;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-4 px-2">
        {messages.length === 0 ? (
          <div className="text-center text-text-muted py-12">
            <div className="text-4xl mb-2">👋</div>
            <p className="text-sm">Start the conversation</p>
          </div>
        ) : messages.map((msg, i) => {
          const isOwn = msg.sender === user._id || msg.sender?._id === user._id;
          return (
            <div key={msg._id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isOwn ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white text-text-primary border border-gray-100 rounded-bl-md'}`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-200' : 'text-text-muted'}`}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </div>
          );
        })}
        {isTyping && <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl px-4 py-2 text-sm text-text-muted animate-pulse-soft">typing...</div></div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white p-3 flex gap-2 rounded-t-2xl">
        <input type="text" value={newMessage} onChange={handleInputChange} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
        <Button onClick={handleSend} loading={sending} disabled={!newMessage.trim()}>Send</Button>
      </div>
    </div>
  );
};

export default ChatPage;
