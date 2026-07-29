import React, { useState } from 'react';

interface ImagePreviewProps {
  images: string[];
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images.length === 0) return null;

  const gridClass = images.length === 1 ? 'grid-cols-1' : 
                    images.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <>
      <div className={`grid ${gridClass} gap-2 mt-3`}>
        {images.map((img, index) => (
          <div 
            key={index}
            className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02]"
            onClick={() => setSelectedImage(img)}
          >
            <img 
              src={img} 
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Preview"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl hover:bg-white/30 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};