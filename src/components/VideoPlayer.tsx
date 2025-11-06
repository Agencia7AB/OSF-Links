import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react";
import {
  query,
  collection,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Video, FeatureButton } from "../types";
import Chat from "./Chat";
import MobileHeader from "./MobileHeader";
import VideoDescription from "./VideoDescription";
import { trackPageView } from "../utils/analytics";

interface VideoPlayerProps {
  slug: string;
}

/** Converte doc do Firestore em Video, garantindo Date */
const mapDocToVideo = (snap: QueryDocumentSnapshot<DocumentData>) => {
  const data = snap.data() || {};
  const toDateSafe = (v: any) => (v?.toDate ? v.toDate() : v ?? null);
  return {
    id: snap.id,
    ...data,
    createdAt: toDateSafe(data.createdAt),
    updatedAt: toDateSafe(data.updatedAt),
    premiereDate: toDateSafe(data.premiereDate),
  } as Video;
};

/** Helpers de formatação de data com fuso */
const BR_TZ = "America/Sao_Paulo";
const MX_TZ = "America/Mexico_City";
const ES_LOCALE = "es-ES";

const fmtWithTZName = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(ES_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(date);

const VideoPlayer: React.FC<VideoPlayerProps> = ({ slug }) => {
  const [video, setVideo] = useState<Video | null>(null);
  const [previousVideo, setPreviousVideo] = useState<Video | null>(null);
  const [nextVideo, setNextVideo] = useState<Video | null>(null);
  const [featureButton, setFeatureButton] = useState<FeatureButton | null>(null);
  const [likes, setLikes] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "description">("chat");

  const lastTrackedIdRef = useRef<string | null>(null);

  const getUserIdentifier = () => {
    let identifier = localStorage.getItem("userIdentifier");
    if (!identifier) {
      identifier = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("userIdentifier", identifier);
    }
    return identifier;
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const extractVideoId = (url: string) => {
    // cobre youtube.com/watch?v=XXXX e youtu.be/XXXX (bem como shorts com fallback do ID principal)
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
    const match = url?.match(regex);
    return match ? match[1] : null;
  };

  /** ------- Assinatura em TEMPO REAL do vídeo pelo slug ------- */
  useEffect(() => {
    setLoading(true);
    setVideo(null);
    setPreviousVideo(null);
    setNextVideo(null);

    const qVideos = query(collection(db, "videos"), where("slug", "==", slug));

    const unsubscribe = onSnapshot(
      qVideos,
      async (snapshot) => {
        if (snapshot.empty) {
          setVideo(null);
          setLoading(false);
          return;
        }

        // Considera o primeiro doc encontrado para o slug
        const videoDoc = snapshot.docs[0];
        const videoData = mapDocToVideo(videoDoc);

        // Redireciona em tempo real se ficar inativo com redirectUrl
        if (!videoData.isActive && videoData.redirectUrl) {
          window.location.href = videoData.redirectUrl;
          return;
        }

        setVideo(videoData);
        setLoading(false);

        // Track page view apenas quando o ID mudar (evita repetições por updates)
        if (videoData.id !== lastTrackedIdRef.current) {
          trackPageView(videoData.id);
          lastTrackedIdRef.current = videoData.id;
        }
      },
      (err) => {
        console.error("Erro ao ouvir vídeo em tempo real:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [slug]);

  /** ------- Ouve em TEMPO REAL o botão especial (featureButton) atrelado ao vídeo ------- */
  useEffect(() => {
    if (!video) return;

    const q = query(
      collection(db, "featureButtons"),
      where("videoId", "==", video.id),
      where("isActive", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setFeatureButton(null);
        return;
      }

      const buttonData = snapshot.docs[0];
      setFeatureButton({
        id: buttonData.id,
        ...buttonData.data(),
        createdAt: buttonData.data().createdAt?.toDate(),
        updatedAt: buttonData.data().updatedAt?.toDate(),
      } as FeatureButton);
    });

    return unsubscribe;
  }, [video]);

  /** ------- Ouve em TEMPO REAL os likes do vídeo ------- */
  useEffect(() => {
    if (!video) return;

    const q = query(collection(db, "videoLikes"), where("videoId", "==", video.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLikes(snapshot.size);
      const userIdentifier = getUserIdentifier();
      const userLike = snapshot.docs.find(
        (doc) => doc.data().userIdentifier === userIdentifier
      );
      setHasLiked(!!userLike);
    });

    return unsubscribe;
  }, [video]);

  /** ------- Ouve em TEMPO REAL previous/next quando os IDs mudarem ------- */
  useEffect(() => {
    if (!video) return;

    let unsubscribePrev: (() => void) | null = null;
    let unsubscribeNext: (() => void) | null = null;

    const attachPrev = (id: string) => {
      const prevRef = doc(db, "videos", id);
      unsubscribePrev = onSnapshot(
        prevRef,
        (snap) => {
          if (snap.exists()) {
            setPreviousVideo(mapDocToVideo(snap as any));
          } else {
            setPreviousVideo(null);
          }
        },
        (err) => {
          console.error("Erro ao ouvir vídeo anterior:", err);
        }
      );
    };

    const attachNext = (id: string) => {
      const nextRef = doc(db, "videos", id);
      unsubscribeNext = onSnapshot(
        nextRef,
        (snap) => {
          if (snap.exists()) {
            setNextVideo(mapDocToVideo(snap as any));
          } else {
            setNextVideo(null);
          }
        },
        (err) => {
          console.error("Erro ao ouvir próximo vídeo:", err);
        }
      );
    };

    // (Re)anexa listeners conforme os IDs atuais
    if (video.previousVideoId) attachPrev(video.previousVideoId);
    else setPreviousVideo(null);

    if (video.nextVideoId) attachNext(video.nextVideoId);
    else setNextVideo(null);

    return () => {
      if (unsubscribePrev) unsubscribePrev();
      if (unsubscribeNext) unsubscribeNext();
    };
  }, [video?.previousVideoId, video?.nextVideoId, video?.id]);

  const handleLike = async () => {
    if (!video) return;

    const userIdentifier = getUserIdentifier();

    try {
      if (hasLiked) {
        const q = query(
          collection(db, "videoLikes"),
          where("videoId", "==", video.id),
          where("userIdentifier", "==", userIdentifier)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await deleteDoc(doc(db, "videoLikes", snapshot.docs[0].id));
        }
      } else {
        await addDoc(collection(db, "videoLikes"), {
          videoId: video.id,
          userIdentifier,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Erro ao processar like:", error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = video?.displayTitle || "Video";

    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title,
          url,
        });
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copiado para a área de transferência!");
      } catch (error) {
        console.error("Erro ao copiar link:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Video no encontrado</h1>
          <p className="text-gray-400">El video que buscas no existe o no está disponible.</p>
        </div>
      </div>
    );
  }

  const videoId = extractVideoId(video.youtubeUrl);
  const isInactive = !video.isActive;
  const showPremiereMode = isInactive && video.inactiveMode === "premiere";
  const showUnavailableMode = isInactive && video.inactiveMode === "unavailable";

  const renderVideoPlayer = () => {
    if (showUnavailableMode) {
      return (
        <div className="absolute top-0 left-0 w-full h-full bg-[#1a1a1a] flex items-center justify-center">
          <div className="text-center px-4">
            <h3 className="text-2xl font-bold text-white mb-2">Video no disponible</h3>
            <p className="text-gray-400">Este contenido no está disponible en este momento</p>
          </div>
        </div>
      );
    }

    if (showPremiereMode) {
      return (
        <div className="absolute top-0 left-0 w-full h-full">
          {video.premiereThumbnailUrl ? (
            <img
              src={video.premiereThumbnailUrl}
              alt="Thumbnail de estreia"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
              <div className="text-center px-4">
                <h3 className="text-2xl font-bold text-white mb-2">En breve</h3>
                <p className="text-gray-400">Este video se estrenará pronto</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
        title={video.displayTitle}
        className="absolute top-0 left-0 w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  };

  const renderPremiereInfo = (classNameWrap = "") => {
    if (!(showPremiereMode && video.premiereDate)) return null;

    const date =
      video.premiereDate instanceof Date ? video.premiereDate : new Date(video.premiereDate as any);

    const br = fmtWithTZName(date, BR_TZ);
    const mx = fmtWithTZName(date, MX_TZ);

    return (
      <div className={classNameWrap}>
        <div className="space-y-1 w-[100%]">
          <p className="text-gray-300">Estreno (México): {mx}</p>
          <p className="text-gray-400">Estreno (Brasil): {br}</p>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-black">
        <MobileHeader video={video} />

        <div className="pb-20">
          <div className="relative pb-[56.25%] h-0 bg-black">{renderVideoPlayer()}</div>

          {renderPremiereInfo("px-4 pt-6 pb-6 text-center")}

          {featureButton && (
            <div className="px-4 pt-3">
              <a
                href={featureButton.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 rounded-lg text-center font-semibold transition-transform hover:scale-[1.02] duration-200"
                style={{
                  backgroundColor: featureButton.backgroundColor,
                  color: featureButton.textColor,
                }}
              >
                {featureButton.text}
              </a>
            </div>
          )}

          {(previousVideo || nextVideo) && (
            <div className="px-4 py-3 flex gap-2">
              {previousVideo && (
                <a
                  href={`/${previousVideo.slug}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#ff7373] text-white rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span className="text-sm">Anterior</span>
                </a>
              )}
              {nextVideo && (
                <a
                  href={`/${nextVideo.slug}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#ff7373] text-white rounded-lg transition-colors"
                >
                  <span className="text-sm">Siguiente</span>
                  <ChevronRight size={20} />
                </a>
              )}
            </div>
          )}

          <div className="px-4">
            <div className="border-b border-[#2a2a2a] flex">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "chat" ? "text-white border-b-2 border-white" : "text-gray-400"
                }`}
              >
                Chat en vivo
              </button>
              <button
                onClick={() => setActiveTab("description")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "description" ? "text-white border-b-2 border-white" : "text-gray-400"
                }`}
              >
                Descripción
              </button>
            </div>

            <div className="mt-4">
              {activeTab === "chat" ? (
                isInactive ? (
                  <div className="text-center py-10 text-gray-400">El chat está deshabilitado</div>
                ) : (
                  <Chat videoId={video.id} isMobile={true} />
                )
              ) : (
                <div className="pb-24">
                  <h1 className="text-lg font-bold text-white mb-3">{video.displayTitle}</h1>
                  {!isInactive && video.description && <VideoDescription video={video} />}
                  {isInactive && video.authorName && (
                    <div className="bg-[#2a2a2a] rounded-xl p-4 border border-[#3a3a3a]">
                      <div className="flex items-start space-x-3">
                        {video.authorPhotoUrl ? (
                          <img
                            src={video.authorPhotoUrl}
                            alt={video.authorName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center">
                            <span className="text-gray-400 text-sm">{video.authorName[0]}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-sm">{video.authorName}</h3>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <MobileHeader video={video} />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-[#2a2a2a] mb-4">
              <div className="relative pb-[56.25%] h-0 bg-black">{renderVideoPlayer()}</div>
            </div>

            {renderPremiereInfo("mb-4 text-center")}

            {featureButton && (
              <div className="mb-4">
                <a
                  href={featureButton.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 px-6 rounded-lg text-center font-semibold transition-transform hover:scale-[1.02] duration-200"
                  style={{
                    backgroundColor: featureButton.backgroundColor,
                    color: featureButton.textColor,
                  }}
                >
                  {featureButton.text}
                </a>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <div className="text-white font-semibold">{video.displayTitle}</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                    hasLiked
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-white border-gray-300 text-black hover:bg-gray-100"
                  }`}
                >
                  <Heart size={18} fill={hasLiked ? "currentColor" : "none"} />
                  <span className="text-sm font-medium">Deja tu like</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-black rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Share2 size={18} />
                  <span className="text-sm font-medium">Comparte este contenido</span>
                </button>
              </div>
            </div>

            {(previousVideo || nextVideo) && (
              <div className="mb-4 flex gap-3">
                {previousVideo && (
                  <a
                    href={`/${previousVideo.slug}`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                    <span>Clase Anterior</span>
                  </a>
                )}
                {nextVideo && (
                  <a
                    href={`/${nextVideo.slug}`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors"
                  >
                    <span>Siguiente Clase</span>
                    <ChevronRight size={20} />
                  </a>
                )}
              </div>
            )}

            {!isInactive && video.description && <VideoDescription video={video} />}
            {isInactive && video.authorName && (
              <div className="bg-[#2a2a2a] rounded-xl p-4 border border-[#3a3a3a]">
                <div className="flex items-start space-x-3">
                  {video.authorPhotoUrl ? (
                    <img
                      src={video.authorPhotoUrl}
                      alt={video.authorName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center">
                      <span className="text-gray-400 text-sm">{video.authorName[0]}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{video.authorName}</h3>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            {isInactive ? (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 text-center">
                <p className="text-gray-400">El chat está deshabilitado</p>
              </div>
            ) : (
              <Chat videoId={video.id} isMobile={false} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
