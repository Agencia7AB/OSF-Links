import React, { useState, useEffect } from 'react';
import { Send, RotateCcw, History, Trash2 } from 'lucide-react';
import {
  collection,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Video } from '../types';

interface ModeratorChatSenderProps {
  videos: Video[];
}

interface MessageHistory {
  message: string;
  link: string;
  timestamp: number;
}

const ModeratorChatSender: React.FC<ModeratorChatSenderProps> = ({ videos }) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [lastLink, setLastLink] = useState('');
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(videos[0].id);
    }
  }, [videos]);

  useEffect(() => {
    const savedLastMessage = localStorage.getItem('moderatorLastMessage');
    const savedLastLink = localStorage.getItem('moderatorLastLink');
    const savedHistory = localStorage.getItem('moderatorMessageHistory');

    if (savedLastMessage) setLastMessage(savedLastMessage);
    if (savedLastLink) setLastLink(savedLastLink);
    if (savedHistory) {
      try {
        setMessageHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      alert('Por favor, insira uma mensagem.');
      return;
    }

    setSending(true);

    try {
      await addDoc(collection(db, 'chatMessages'), {
        videoId: selectedVideoId,
        username: 'Moderador',
        message: message.trim(),
        link: link.trim() || null,
        isModerator: true,
        timestamp: new Date(),
      });

      const trimmedMessage = message.trim();
      const trimmedLink = link.trim();

      setLastMessage(trimmedMessage);
      setLastLink(trimmedLink);

      localStorage.setItem('moderatorLastMessage', trimmedMessage);
      localStorage.setItem('moderatorLastLink', trimmedLink);

      const newHistoryItem: MessageHistory = {
        message: trimmedMessage,
        link: trimmedLink,
        timestamp: Date.now()
      };

      const updatedHistory = [newHistoryItem, ...messageHistory].slice(0, 20);
      setMessageHistory(updatedHistory);
      localStorage.setItem('moderatorMessageHistory', JSON.stringify(updatedHistory));

      setMessage('');
      setLink('');
      alert('Mensagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleRepeatLastMessage = async () => {
    if (!lastMessage) {
      alert('Nenhuma mensagem anterior para repetir.');
      return;
    }

    setSending(true);

    try {
      await addDoc(collection(db, 'chatMessages'), {
        videoId: selectedVideoId,
        username: 'Moderador',
        message: lastMessage,
        link: lastLink || null,
        isModerator: true,
        timestamp: new Date(),
      });

      alert('Mensagem anterior reenviada com sucesso!');
    } catch (error) {
      console.error('Erro ao reenviar mensagem:', error);
      alert('Erro ao reenviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleResendFromHistory = async (historyItem: MessageHistory) => {
    if (!confirm('Deseja reenviar esta mensagem?')) return;

    setSending(true);

    try {
      await addDoc(collection(db, 'chatMessages'), {
        videoId: selectedVideoId,
        username: 'Moderador',
        message: historyItem.message,
        link: historyItem.link || null,
        isModerator: true,
        timestamp: new Date(),
      });

      alert('Mensagem reenviada com sucesso!');
    } catch (error) {
      console.error('Erro ao reenviar mensagem:', error);
      alert('Erro ao reenviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteHistoryItem = (timestamp: number) => {
    const updatedHistory = messageHistory.filter(item => item.timestamp !== timestamp);
    setMessageHistory(updatedHistory);
    localStorage.setItem('moderatorMessageHistory', JSON.stringify(updatedHistory));
  };

  const handleClearHistory = () => {
    if (!confirm('Tem certeza que deseja limpar todo o histórico de mensagens?')) return;
    setMessageHistory([]);
    localStorage.removeItem('moderatorMessageHistory');
  };

  const selectedVideo = videos.find(v => v.id === selectedVideoId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Send className="mr-3 text-[#00DBD9]" />
          Enviar Mensagem no Chat (Moderador)
        </h2>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Selecione o vídeo
        </label>
        <select
          value={selectedVideoId}
          onChange={(e) => setSelectedVideoId(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00DBD9]"
        >
          {videos.map(video => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          Enviar mensagem como Moderador no chat de: {selectedVideo?.title}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Mensagem *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00DBD9]"
              rows={4}
              placeholder="Digite a mensagem do moderador..."
              required
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/500 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Link (opcional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00DBD9]"
              placeholder="https://exemplo.com (opcional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se preenchido, o link será exibido abaixo da mensagem e será clicável
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-400 mb-2">Preview da mensagem:</p>
            <div className="bg-[#131313] rounded-xl p-3 border border-[#2b2b2b]">
              <span className="text-[11px] block mb-1" style={{ color: '#FFE100' }}>
                Moderador
              </span>
              {message ? (
                <>
                  <p className="text-sm leading-snug break-words text-white">
                    {message}
                  </p>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm leading-snug break-words hover:underline"
                      style={{ color: '#FFE100' }}
                    >
                      {link}
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Sua mensagem aparecerá aqui...</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {lastMessage && (
              <button
                type="button"
                onClick={handleRepeatLastMessage}
                disabled={sending}
                className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <RotateCcw size={18} className="mr-2" />
                )}
                Repetir Última
              </button>
            )}
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex items-center px-6 py-3 bg-[#00DBD9] hover:bg-[#80f8f6] disabled:bg-[#a9faf9] disabled:opacity-50 text-black rounded-lg transition-colors"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Send size={18} className="mr-2" />
              )}
              {sending ? 'Enviando...' : 'Enviar Mensagem'}
            </button>
          </div>
        </form>
      </div>

      {messageHistory.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <History className="mr-2 text-red-500" size={20} />
              Histórico de Mensagens ({messageHistory.length})
            </h3>
            <button
              onClick={handleClearHistory}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Limpar Histórico
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messageHistory.map((item) => (
              <div
                key={item.timestamp}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:bg-gray-750 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="bg-[#131313] rounded-xl p-3 border border-[#2b2b2b] mb-2">
                      <span className="text-[11px] block mb-1" style={{ color: '#FFE100' }}>
                        Moderador
                      </span>
                      <p className="text-sm leading-snug break-words text-white">
                        {item.message}
                      </p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm leading-snug break-words hover:underline"
                          style={{ color: '#FFE100' }}
                        >
                          {item.link}
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResendFromHistory(item)}
                      disabled={sending}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded text-sm transition-colors"
                      title="Reenviar esta mensagem"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteHistoryItem(item.timestamp)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                      title="Remover do histórico"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorChatSender;
