import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatMessage, ChatModeration as ChatModerationType, Video } from '../types';
import { Trash2, VolumeX, MessageCircle, Volume2 } from 'lucide-react';

interface ChatModerationProps {
  videos: Video[];
}

const ChatModeration: React.FC<ChatModerationProps> = ({ videos }) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [moderations, setModerations] = useState<ChatModerationType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(videos[0].id);
    }
  }, [videos]);

  useEffect(() => {
    if (!selectedVideoId) return;

    setLoading(true);

    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('videoId', '==', selectedVideoId),
      orderBy('timestamp', 'desc')
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })) as ChatMessage[];
      setMessages(messagesData);
      setLoading(false);
    });

    const moderationQuery = query(
      collection(db, 'chatModeration'),
      where('videoId', '==', selectedVideoId)
    );

    const unsubModeration = onSnapshot(moderationQuery, (snapshot) => {
      const moderationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        mutedUntil: doc.data().mutedUntil?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      })) as ChatModerationType[];
      setModerations(moderationData);
    });

    return () => {
      unsubMessages();
      unsubModeration();
    };
  }, [selectedVideoId]);

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta mensagem?')) return;

    try {
      await deleteDoc(doc(db, 'chatMessages', messageId));
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      alert('Erro ao deletar mensagem');
    }
  };

  const muteUser = async (username: string) => {
    try {
      const docRef = doc(db, 'chatModeration', `${selectedVideoId}_${username}`);

      await setDoc(docRef, {
        videoId: selectedVideoId,
        username,
        mutedUntil: null,
        permanentlyMuted: true,
        createdAt: new Date()
      });

      alert(`Usuário ${username} foi silenciado permanentemente`);
    } catch (error) {
      console.error('Erro ao silenciar usuário:', error);
      alert('Erro ao silenciar usuário');
    }
  };

  const unmuteUser = async (username: string) => {
    try {
      const docRef = doc(db, 'chatModeration', `${selectedVideoId}_${username}`);
      await deleteDoc(docRef);
      alert(`Usuário ${username} foi dessilenciado`);
    } catch (error) {
      console.error('Erro ao dessilenciar:', error);
      alert('Erro ao dessilenciar usuário');
    }
  };

  const isUserMuted = (username: string) => {
    const moderation = moderations.find(m => m.username === username);
    if (!moderation) return false;

    if (moderation.permanentlyMuted) return true;
    if (moderation.mutedUntil && moderation.mutedUntil > new Date()) return true;

    return false;
  };

  const getMutedStatus = (username: string) => {
    const moderation = moderations.find(m => m.username === username);
    if (!moderation) return null;

    if (moderation.permanentlyMuted) {
      return 'Silenciado permanentemente';
    }

    if (moderation.mutedUntil && moderation.mutedUntil > new Date()) {
      const minutes = Math.ceil((moderation.mutedUntil.getTime() - Date.now()) / 60000);
      return `Silenciado por ${minutes} min`;
    }

    return null;
  };

  const selectedVideo = videos.find(v => v.id === selectedVideoId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <MessageCircle className="mr-3 text-[#00DBD9]" />
          Moderação de Chat
        </h2>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Selecione o vídeo
        </label>
        <select
          value={selectedVideoId}
          onChange={(e) => setSelectedVideoId(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {videos.map(video => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </select>
      </div>

      {selectedVideoId && (
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">
            {selectedVideo?.title} - Mensagens em tempo real
          </h3>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              Nenhuma mensagem no chat ainda
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map((message) => {
                const muted = isUserMuted(message.username);
                const mutedStatus = getMutedStatus(message.username);

                return (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border ${
                      muted ? 'bg-red-900/20 border-red-800' : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-semibold text-sm">
                            {message.username}
                          </span>
                          {mutedStatus && (
                            <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">
                              {mutedStatus}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {message.timestamp?.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-gray-300 text-sm">
                          {message.message}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Deletar mensagem"
                        >
                          <Trash2 size={14} />
                        </button>

                        {!muted ? (
                          <button
                            onClick={() => muteUser(message.username)}
                            className="flex items-center px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors"
                            title="Silenciar permanentemente"
                          >
                            <VolumeX size={14} className="mr-1" />
                            Silenciar
                          </button>
                        ) : (
                          <button
                            onClick={() => unmuteUser(message.username)}
                            className="flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                          >
                            <Volume2 size={14} className="mr-1" />
                            Dessilenciar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatModeration;
