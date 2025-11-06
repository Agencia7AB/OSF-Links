import React from "react";
import { Video } from "../types";
import Icon from "../assets/OSF.svg";

interface MobileHeaderProps {
  video: Video;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ video }) => {
  return (
    <div className="bg-black border-b border-[#3a3a3a] p-4">
      <div className="flex justify-center">
        {video.logoUrl ? (
          <>
            <img
              src={Icon}
              alt="Logo"
              className="h-8 max-w-32 object-contain"
            />

            <p className="text-3xl ml-5 mr-5 -mt-1 text-white">|</p>

            <img
              src={video.logoUrl}
              alt="Logo"
              className="h-8 max-w-32 object-contain"
            />
          </>
        ) : (
          <div className="h-8 w-32 bg-[#3a3a3a] rounded flex items-center justify-center">
            <span className="text-gray-500 text-sm">Logo</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileHeader;
