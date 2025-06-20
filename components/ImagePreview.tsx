import React from 'react';

interface ImagePreviewProps {
  src: string;
  alt: string;
  title?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt, title }) => (
  <div className="my-4 p-2 border border-gray-200 rounded-lg bg-white">
    {title && <h3 className="text-md font-semibold text-gray-700 mb-2 text-center">{title}</h3>}
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full h-auto rounded-md shadow-sm mx-auto max-h-[300px] object-contain" 
    />
  </div>
);
export default ImagePreview;
