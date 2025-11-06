import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Trash2 } from 'lucide-react';
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
import { FeatureButton, Video } from '../types';

interface FeatureButtonManagerProps {
  videos: Video[];
}

const FeatureButtonManager: React.FC<FeatureButtonManagerProps> = ({ videos }) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [featureButtons, setFeatureButtons] = useState<FeatureButton[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    link: '',
    isActive: true,
    backgroundColor: '#4ade80',
    textColor: '#000000'
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
      collection(db, 'featureButtons'),
      where('videoId', '==', selectedVideoId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as FeatureButton[];
      setFeatureButtons(data);
    });

    return unsubscribe;
  }, [selectedVideoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateDoc(doc(db, 'featureButtons', editingId), {
          text: formData.text,
          link: formData.link,
          isActive: formData.isActive,
          backgroundColor: formData.backgroundColor,
          textColor: formData.textColor,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'featureButtons'), {
          videoId: selectedVideoId,
          text: formData.text,
          link: formData.link,
          isActive: formData.isActive,
          backgroundColor: formData.backgroundColor,
          textColor: formData.textColor,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setFormData({
        text: '',
        link: '',
        isActive: true,
        backgroundColor: '#4ade80',
        textColor: '#000000'
      });
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao salvar botão:', error);
      alert('Erro ao salvar botão');
    }
  };

  const handleEdit = (button: FeatureButton) => {
    setFormData({
      text: button.text,
      link: button.link,
      isActive: button.isActive,
      backgroundColor: button.backgroundColor,
      textColor: button.textColor
    });
    setEditingId(button.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este botão?')) return;

    try {
      await deleteDoc(doc(db, 'featureButtons', id));
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar botão');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'featureButtons', id), {
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
          <Plus className="mr-3 text-[#00DBD9]" />
          Gerenciar Feature Buttons
        </h2>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({
                text: '',
                link: '',
                isActive: true,
                backgroundColor: '#4ade80',
                textColor: '#000000'
              });
            }}
            className="bg-[#00DBD9] hover:bg-[#97fffd] text-black px-4 py-2 rounded-lg transition-colors"
          >
            Novo Feature Button
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
              {editingId ? 'Editar' : 'Novo'} Feature Button
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({
                  text: '',
                  link: '',
                  isActive: true,
                  backgroundColor: '#4ade80',
                  textColor: '#000000'
                });
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Texto do Botão *
              </label>
              <input
                type="text"
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ex: Pulsa para hacer tu inscripción"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Link do Botão *
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://exemplo.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cor de Fundo
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="#4ade80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cor do Texto
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.textColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.textColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Preview
              </label>
              <button
                type="button"
                className="w-full py-3 px-6 rounded-lg text-center font-semibold"
                style={{
                  backgroundColor: formData.backgroundColor,
                  color: formData.textColor
                }}
              >
                {formData.text || 'Preview do botão'}
              </button>
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
                Botão ativo (visível na página do vídeo)
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    text: '',
                    link: '',
                    isActive: true,
                    backgroundColor: '#4ade80',
                    textColor: '#000000'
                  });
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-[#00DBD9] hover:bg-[#90fdfb] text-black rounded-lg transition-colors"
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
            {selectedVideo?.title} - Feature Buttons
          </h3>
        </div>

        <div className="divide-y divide-gray-800">
          {featureButtons.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum feature button para este vídeo
            </div>
          ) : (
            featureButtons.map((button) => (
              <div key={button.id} className="p-4 hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        button.isActive
                          ? 'bg-green-900 text-green-400'
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {button.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div
                      className="inline-block py-2 px-4 rounded-lg font-semibold mb-2"
                      style={{
                        backgroundColor: button.backgroundColor,
                        color: button.textColor
                      }}
                    >
                      {button.text}
                    </div>
                    <p className="text-sm text-gray-400 break-all">{button.link}</p>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleActive(button.id, button.isActive)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        button.isActive
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {button.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleEdit(button)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(button.id)}
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

export default FeatureButtonManager;
