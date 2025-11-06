import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Download } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Video, ChatMessage } from '../types';
import VideoForm from './VideoForm';
import Analytics from './Analytics';
import ChatModeration from './ChatModeration';
import FeatureButtonManager from './FeatureButtonManager';
import PinnedMessageManager from './PinnedMessageManager';


const VideoManager: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'analytics' | 'moderation' | 'buttons' | 'pinned'>('videos');

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Video[];
      setVideos(videosData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const downloadChatAsCSV = async (videoId: string, videoTitle: string) => {
    try {
      const q = query(
        collection(db, 'chatMessages'),
        where('videoId', '==', videoId),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const messages: ChatMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })) as ChatMessage[];

      if (messages.length === 0) {
        alert('Não há mensagens de chat para este vídeo.');
        return;
      }

      const csvContent = [
        'Username,Message,Timestamp',
        ...messages.map(msg => 
          `"${msg.username}","${msg.message.replace(/"/g, '""')}","${msg.timestamp?.toLocaleString() || ''}"`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `chat_${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar chat:', error);
      alert('Erro ao baixar o chat. Tente novamente.');
    }
  };

  const openEditForm = (video: Video) => {
    setEditingVideo(video);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingVideo(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Painel Administrativo</h2>
        {activeTab === 'videos' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center transition duration-200"
          >
            <Plus className="mr-2" size={20} />
            Novo Vídeo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-800">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('videos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'videos'
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Vídeos
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('moderation')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'moderation'
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Moderação de Chat
            </button>
            <button
              onClick={() => setActiveTab('buttons')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'buttons'
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Feature Buttons
            </button>
            <button
              onClick={() => setActiveTab('pinned')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pinned'
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Mensagens Fixadas
            </button>
          </nav>
        </div>
      </div>
      {showForm && (
        <VideoForm
          video={editingVideo}
          onClose={closeForm}
          allVideos={videos}
        />
      )}

      {/* Tab Content */}
      {activeTab === 'videos' && (
        <div className="rounded-xl shadow-lg overflow-hidden border border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Logo
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-800 transition duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white font-medium">{video.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {video.logoUrl ? (
                        <img 
                          src={video.logoUrl} 
                          alt="Logo" 
                          className="h-8 max-w-16 object-contain bg-gray-700 rounded p-1"
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">Sem logo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-400 font-mono">/{video.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        video.isActive 
                          ? 'bg-green-900 text-green-400' 
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {video.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {video.createdAt?.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditForm(video)}
                          className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        
                        <button
                          onClick={() => downloadChatAsCSV(video.id, video.title)}
                          className="text-yellow-400 hover:text-yellow-300 p-1 rounded transition-colors"
                          title="Baixar Chat CSV"
                        >
                          <Download size={18} />
                        </button>
                        <a
                          href={`/${video.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 p-1 rounded transition-colors"
                          title="Ver Página"
                        >
                          <Eye size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {videos.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Nenhum vídeo cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && <Analytics videos={videos} />}

      {activeTab === 'moderation' && <ChatModeration videos={videos} />}

      {activeTab === 'buttons' && <FeatureButtonManager videos={videos} />}

      {activeTab === 'pinned' && <PinnedMessageManager videos={videos} />}
    </div>
  );
};

export default VideoManager;