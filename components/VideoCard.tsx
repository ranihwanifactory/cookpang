
import React from 'react';
import { RecipeVideo } from '../types';
import { Play, Heart } from 'lucide-react';

interface VideoCardProps {
  video: RecipeVideo;
  isFavorite: boolean;
  onSelect: (video: RecipeVideo) => void;
  onToggleFavorite: (e: React.MouseEvent, videoId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isFavorite, onSelect, onToggleFavorite }) => {
  return (
    <div 
      onClick={() => onSelect(video)}
      className="recipe-card-hover group relative bg-white rounded-2xl overflow-hidden cursor-pointer border border-orange-100 shadow-sm"
    >
      <div className="relative aspect-video">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-orange-500 p-3 rounded-full text-white transform scale-90 group-hover:scale-100 transition-transform">
            <Play size={24} fill="currentColor" />
          </div>
        </div>
        <button
          onClick={(e) => onToggleFavorite(e, video.id)}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-rose-500 transition-colors shadow-md"
        >
          <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <span className="absolute bottom-3 left-3 px-2 py-1 text-xs font-bold text-white bg-orange-600/80 rounded backdrop-blur-sm">
          {video.category}
        </span>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-gray-800 line-clamp-1 mb-1 group-hover:text-orange-600 transition-colors">
          {video.title}
        </h3>
        <p className="text-sm text-gray-500 flex items-center gap-1">
          {video.channelTitle}
        </p>
      </div>
    </div>
  );
};

export default VideoCard;
