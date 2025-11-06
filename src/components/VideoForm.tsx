import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Video } from '../types';

interface VideoFormProps {
  video?: Video | null;
  onClose: () => void;
  allVideos: Video[];
}

/** ---------- Utils de Data ---------- **/
const isValidDate = (d: any): d is Date =>
  d instanceof Date && !isNaN(d.getTime());

/** Converte qualquer coisa (Timestamp/Date/string/number) em Date válida ou null */
const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  // Firestore Timestamp (tem .toDate)
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return isValidDate(d) ? d : null;
  }
  // Já é Date
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }
  // number ou string
  const d = new Date(value);
  return isValidDate(d) ? d : null;
};

/** Formata uma Date para o formato aceito por <input type="datetime-local"> no FUSO LOCAL */
const formatDatetimeLocal = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

/** ---------- Utils diversos ---------- **/
const validateYouTubeUrl = (url: string) => {
  // Aceita youtube.com/watch?v=, youtu.be/, e shorts
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i;
  return youtubeRegex.test(url);
};

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/** Tenta deletar do Storage a partir de uma URL pública.
 *  Observação: nem toda URL pública é resolvida por `ref(storage, url)`.
 *  Se falhar, apenas loga e mantém a UX fluindo.
 */
const deleteByUrlIfPossible = async (url?: string) => {
  if (!url) return;
  try {
    const r = ref(storage, url); // tenta tratar como gs:// ou https
    await deleteObject(r);
  } catch (e) {
    console.warn('Não foi possível deletar do storage a partir da URL:', e);
  }
};

const VideoForm: React.FC<VideoFormProps> = ({ video, onClose, allVideos }) => {
  const [formData, setFormData] = useState({
    title: '',
    displayTitle: '',
    youtubeUrl: '',
    slug: '',
    description: '',
    isActive: true,
    redirectUrl: '',
    logoUrl: '',
    previousVideoId: '',
    nextVideoId: '',
    bannerDesktopUrl: '',
    bannerMobileUrl: '',
    bannerLink: '',
    bannerActive: false,
    authorName: '',
    authorPhotoUrl: '',
    inactiveMode: 'unavailable' as 'unavailable' | 'premiere',
    premiereDate: '',              // string no formato datetime-local
    premiereThumbnailUrl: ''
  });

  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBannerDesktop, setUploadingBannerDesktop] = useState(false);
  const [uploadingBannerMobile, setUploadingBannerMobile] = useState(false);
  const [uploadingAuthorPhoto, setUploadingAuthorPhoto] = useState(false);
  const [uploadingPremiereThumbnail, setUploadingPremiereThumbnail] = useState(false);
  const [error, setError] = useState('');

  /** Carrega dados do vídeo (edição) de forma segura */
  useEffect(() => {
    if (!video) return;
    const parsedPremiere = toDateOrNull(video.premiereDate);
    setFormData({
      title: video.title,
      displayTitle: video.displayTitle,
      youtubeUrl: video.youtubeUrl,
      slug: video.slug,
      description: video.description || '',
      isActive: Boolean(video.isActive),
      redirectUrl: video.redirectUrl || '',
      logoUrl: video.logoUrl || '',
      previousVideoId: video.previousVideoId || '',
      nextVideoId: video.nextVideoId || '',
      bannerDesktopUrl: video.bannerDesktopUrl || '',
      bannerMobileUrl: video.bannerMobileUrl || '',
      bannerLink: video.bannerLink || '',
      bannerActive: Boolean(video.bannerActive),
      authorName: video.authorName || '',
      authorPhotoUrl: video.authorPhotoUrl || '',
      inactiveMode: (video.inactiveMode as 'unavailable' | 'premiere') || 'unavailable',
      premiereDate: parsedPremiere ? formatDatetimeLocal(parsedPremiere) : '',
      premiereThumbnailUrl: video.premiereThumbnailUrl || ''
    });
  }, [video]);

  const checkSlugExists = (slug: string) => {
    return allVideos.some(v => v.slug === slug && v.id !== video?.id);
  };

  /** ---------- Upload handlers ---------- **/
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB.');
      return;
    }

    setUploadingLogo(true);
    setError('');
    try {
      const r = storageRef(storage, `video-logos/logo-${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(r, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, logoUrl: downloadURL }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setError('Erro ao fazer upload da imagem. Tente novamente.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!formData.logoUrl || !confirm('Tem certeza que deseja remover a logo?')) return;
    try {
      await deleteByUrlIfPossible(formData.logoUrl);
      setFormData(prev => ({ ...prev, logoUrl: '' }));
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      setError('Erro ao remover a logo. Tente novamente.');
    }
  };

  const handleBannerDesktopUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setUploadingBannerDesktop(true);
    setError('');
    try {
      const r = storageRef(storage, `video-banners/desktop-${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(r, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, bannerDesktopUrl: downloadURL }));
    } catch (error) {
      console.error('Erro ao fazer upload do banner:', error);
      setError('Erro ao fazer upload do banner. Tente novamente.');
    } finally {
      setUploadingBannerDesktop(false);
    }
  };

  const handleBannerMobileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setUploadingBannerMobile(true);
    setError('');
    try {
      const r = storageRef(storage, `video-banners/mobile-${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(r, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, bannerMobileUrl: downloadURL }));
    } catch (error) {
      console.error('Erro ao fazer upload do banner:', error);
      setError('Erro ao fazer upload do banner. Tente novamente.');
    } finally {
      setUploadingBannerMobile(false);
    }
  };

  const handleAuthorPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setUploadingAuthorPhoto(true);
    setError('');
    try {
      const r = storageRef(storage, `author-photos/photo-${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(r, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, authorPhotoUrl: downloadURL }));
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      setError('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploadingAuthorPhoto(false);
    }
  };

  const handlePremiereThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setUploadingPremiereThumbnail(true);
    setError('');
    try {
      const r = storageRef(storage, `premiere-thumbnails/thumb-${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(r, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, premiereThumbnailUrl: downloadURL }));
    } catch (error) {
      console.error('Erro ao fazer upload da thumbnail:', error);
      setError('Erro ao fazer upload da thumbnail. Tente novamente.');
    } finally {
      setUploadingPremiereThumbnail(false);
    }
  };

  /** ---------- Submit ---------- **/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!validateYouTubeUrl(formData.youtubeUrl)) {
        throw new Error('URL do YouTube inválida');
      }

      if (!formData.slug.trim()) {
        throw new Error('Defina um slug válido');
      }

      if (checkSlugExists(formData.slug)) {
        throw new Error('Este slug já está em uso');
      }

      // Converte a string do input datetime-local para Date (local time)
      const premiereDateObj = formData.premiereDate
        ? new Date(formData.premiereDate) // "YYYY-MM-DDTHH:mm" -> Date em fuso local
        : null;

      // Monta payload
      const videoData = {
        ...formData,
        logoUrl: formData.logoUrl || null,
        previousVideoId: formData.previousVideoId || null,
        nextVideoId: formData.nextVideoId || null,
        // Salva Date puro (Firestore converte) ou null
        premiereDate: premiereDateObj ? new Date(premiereDateObj) : null,
        updatedAt: new Date()
      };

      if (video?.id) {
        await updateDoc(doc(db, 'videos', video.id), videoData as any);
      } else {
        await addDoc(collection(db, 'videos'), {
          ...videoData,
          createdAt: new Date()
        } as any);
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar vídeo:', err);
      setError(err?.message || 'Erro ao salvar vídeo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  const availableVideos = allVideos.filter(v => v.id !== video?.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h3 className="text-2xl font-bold text-white">
            {video ? 'Editar Vídeo' : 'Novo Vídeo'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Título (Identificação) *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Título para identificação interna"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Título de Exibição *
            </label>
            <input
              type="text"
              value={formData.displayTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, displayTitle: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Título que será exibido na página do vídeo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              URL do YouTube *
            </label>
            <input
              type="url"
              value={formData.youtubeUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              required
            />
            <p className="text-gray-400 text-sm mt-1">
              Acesso: /{formData.slug}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              URL de Redirecionamento (quando inativo)
            </label>
            <input
              type="url"
              value={formData.redirectUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, redirectUrl: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="https://exemplo.com (opcional)"
            />
            <p className="text-gray-400 text-sm mt-1">
              Se preenchido, usuários serão redirecionados para esta URL quando o vídeo estiver inativo
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Logo do Vídeo
            </label>

            {/* Preview da Logo */}
            <div className="mb-4">
              {formData.logoUrl ? (
                <div className="flex items-center space-x-4">
                  <img
                    src={formData.logoUrl}
                    alt="Logo do vídeo"
                    className="h-12 max-w-32 object-contain bg-gray-700 rounded-lg p-2"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200 text-sm"
                  >
                    <Trash2 className="mr-1" size={14} />
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-32 h-12 bg-gray-700 rounded-lg">
                  <ImageIcon className="h-6 w-6 text-gray-500" />
                  <span className="ml-2 text-gray-500 text-sm">Sem logo</span>
                </div>
              )}
            </div>

            {/* Upload */}
            <label className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition duration-200 w-fit">
              {uploadingLogo ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Upload className="mr-2" size={16} />
              )}
              {uploadingLogo ? 'Enviando...' : 'Escolher Logo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Descrição do vídeo
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Escreva uma breve descrição sobre o vídeo"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Vídeo Anterior
              </label>
              <select
                value={formData.previousVideoId}
                onChange={(e) => setFormData(prev => ({ ...prev, previousVideoId: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Nenhum</option>
                {allVideos.filter(v => v.id !== video?.id).map(v => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Próximo Vídeo
              </label>
              <select
                value={formData.nextVideoId}
                onChange={(e) => setFormData(prev => ({ ...prev, nextVideoId: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Nenhum</option>
                {allVideos.filter(v => v.id !== video?.id).map(v => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 space-y-6">
            <h4 className="text-lg font-semibold text-white">Autor da Descrição</h4>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nome do Autor
              </label>
              <input
                type="text"
                value={formData.authorName}
                onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ex: Rayanepinto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Foto do Autor
              </label>
              {formData.authorPhotoUrl && (
                <div className="mb-2">
                  <img src={formData.authorPhotoUrl} alt="Foto do Autor" className="w-12 h-12 rounded-full object-cover" />
                </div>
              )}
              <label className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition duration-200 w-fit">
                {uploadingAuthorPhoto ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Upload className="mr-2" size={16} />
                )}
                {uploadingAuthorPhoto ? 'Enviando...' : 'Escolher Foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAuthorPhotoUpload}
                  disabled={uploadingAuthorPhoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 space-y-6">
            <h4 className="text-lg font-semibold text-white">Status do Vídeo</h4>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="mr-3 h-4 w-4 text-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500"
              />
              <label htmlFor="isActive" className="text-gray-400">
                Vídeo ativo (visível para usuários)
              </label>
            </div>

            {!formData.isActive && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Modo quando inativo
                  </label>
                  <select
                    value={formData.inactiveMode}
                    onChange={(e) => setFormData(prev => ({ ...prev, inactiveMode: e.target.value as 'unavailable' | 'premiere' }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="unavailable">Vídeo não disponível</option>
                    <option value="premiere">Aguardando estreia</option>
                  </select>
                </div>

                {formData.inactiveMode === 'premiere' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Data de Estreia
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.premiereDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, premiereDate: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Esta data será exibida abaixo do vídeo
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Thumbnail da Estreia (Capa)
                      </label>
                      {formData.premiereThumbnailUrl && (
                        <div className="mb-2">
                          <img src={formData.premiereThumbnailUrl} alt="Thumbnail" className="w-full max-w-md h-auto rounded-lg" />
                        </div>
                      )}
                      <label className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition duration-200 w-fit">
                        {uploadingPremiereThumbnail ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Upload className="mr-2" size={16} />
                        )}
                        {uploadingPremiereThumbnail ? 'Enviando...' : 'Escolher Thumbnail'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePremiereThumbnailUpload}
                          disabled={uploadingPremiereThumbnail}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        Imagem que será exibida no lugar do player do YouTube. Recomendado: 16:9 (1280x720px)
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#00DBD9] hover:bg-[#7afffd] disabled:bg-[#8cfcfa] text-black rounded-lg flex items-center transition duration-200"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="mr-2" size={18} />
              )}
              {video ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoForm;
