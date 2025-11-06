import React from "react";
import { Video } from "../types";
import { User } from "lucide-react";

interface VideoDescriptionProps {
  video: Video;
}

const VideoDescription: React.FC<VideoDescriptionProps> = ({ video }) => {
  if (!video.description) {
    return null;
  }

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-4 border border-[#3a3a3a]">
      <div className="flex items-start space-x-3 mb-3">
        {video.authorPhotoUrl ? (
          <img
            src={video.authorPhotoUrl}
            alt={video.authorName || "Author"}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center">
            <User size={20} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">
            {video.authorName || "Author"}
          </h3>
          <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap break-words">
            {video.description}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDescription;
