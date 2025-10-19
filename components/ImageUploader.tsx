import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  onImageUpload: (image: { file: File; base64: string } | null) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setPreview(reader.result as string);
        onImageUpload({ file, base64: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
       // Manually create a ChangeEvent to reuse handleFileChange logic
       const manualEvent = {
         target: { files: event.dataTransfer.files }
       } as unknown as React.ChangeEvent<HTMLInputElement>;
       handleFileChange(manualEvent);
    }
  }, []);
  
  return (
    <div className="flex-grow flex flex-col">
      <label
        htmlFor="file-upload"
        className="relative flex-grow flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {preview ? (
          <img src={preview} alt="Design Preview" className="object-contain h-full w-full max-h-80 rounded-lg p-2" />
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon />
            <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </label>
      <input id="file-upload" ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      {fileName && (
         <div className="mt-4 text-center text-sm text-on-surface-secondary">
           File: <span className="font-medium text-on-surface">{fileName}</span>
         </div>
       )}
    </div>
  );
};
