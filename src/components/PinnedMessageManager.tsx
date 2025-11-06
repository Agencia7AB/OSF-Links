import React, { useState, useEffect } from 'react';
import { Pin, X, Save, Trash2 } from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PinnedMessage, Video } from '../types';

interface PinnedMessageManagerProps {
  videos: Video[];
}

const PinnedMessageManager: React.FC<PinnedMessageManagerProps> = ({ videos }) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    link: '',
    isActive: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(videos[0].id);
    }
  }, [videos]);

  useEffect(() => {
    if (!selectedVideoId) return;

    const q = query(
      collection(db, 'pinnedMessages'),
      where('videoId', '==', selectedVideoId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as PinnedMessage[];
      setPinnedMessages(data);
    });

    return unsubscribe;
  }, [selectedVideoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateDoc(doc(db, 'pinnedMessages', editingId), {
          message: formData.message,
          link: formData.link || null,
          isActive: formData.isActive,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'pinnedMessages'), {
          videoId: selectedVideoId,
          message: formData.message,
          link: formData.link || null,
          isActive: formData.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setFormData({ message: '', link: '', isActive: true });
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao salvar mensagem fixada:', error);
      alert('Erro ao salvar mensagem fixada');
    }
  };

  const handleEdit = (pinned: PinnedMessage) => {
    setFormData({
      message: pinned.message,
      link: pinned.link || '',
      isActive: pinned.isActive
    });
    setEditingId(pinned.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta mensagem fixada?')) return;

    try {
      await deleteDoc(doc(db, 'pinnedMessages', id));
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar mensagem fixada');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'pinnedMessages', id), {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const selectedVideo = videos.find(v => v.id === selectedVideoId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Pin className="mr-3 text-red-500" />
          Gerenciar Mensagens Fixadas
        </h2>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ message: '', link: '', isActive: true });
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Nova Mensagem Fixada
          </button>
        )}
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

      {showForm && (
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? 'Editar' : 'Nova'} Mensagem Fixada
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ message: '', link: '', isActive: true });
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Mensagem *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                required
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Link (opcional)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://exemplo.com"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="mr-3 h-4 w-4 text-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500"
              />
              <label htmlFor="isActive" className="text-gray-400">
                Mensagem ativa (visível no chat)
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ message: '', link: '', isActive: true });
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Save size={16} className="mr-2" />
                {editingId ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">
            {selectedVideo?.title} - Mensagens Fixadas
          </h3>
        </div>

        <div className="divide-y divide-gray-800">
          {pinnedMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma mensagem fixada para este vídeo
            </div>
          ) : (
            pinnedMessages.map((pinned) => (
              <div key={pinned.id} className="p-4 hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Pin size={16} className="text-gray-400" />
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        pinned.isActive
                          ? 'bg-green-900 text-green-400'
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {pinned.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <p className="text-white mb-1">{pinned.message}</p>
                    {pinned.link && (
                      <a
                        href={pinned.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:underline"
                      >
                        {pinned.link}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleActive(pinned.id, pinned.isActive)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        pinned.isActive
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {pinned.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleEdit(pinned)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(pinned.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PinnedMessageManager;
