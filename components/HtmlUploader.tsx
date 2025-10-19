import React, { useState, useRef, useCallback } from 'react';

interface HtmlUploaderProps {
  onHtmlUpload: (html: string | null) => void;
}

export const HtmlUploader: React.FC<HtmlUploaderProps> = ({ onHtmlUpload }) => {
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const htmlContent = reader.result as string;
        onHtmlUpload(htmlContent);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && (file.type === 'text/html' || file.name.endsWith('.html'))) {
       const manualEvent = {
         target: { files: event.dataTransfer.files }
       } as unknown as React.ChangeEvent<HTMLInputElement>;
       handleFileChange(manualEvent);
    }
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="flex-grow flex flex-col">
      <label
        htmlFor="html-file-upload"
        className="relative flex-grow flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
            <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">HTML file (*.html)</p>
          </div>
      </label>
      <input id="html-file-upload" ref={fileInputRef} type="file" className="hidden" accept=".html,text/html" onChange={handleFileChange} />
      {fileName ? (
         <div className="mt-4 text-center text-sm text-on-surface-secondary">
           File: <span className="font-medium text-on-surface">{fileName}</span>
         </div>
       ) : (
        <button
          onClick={handleClick}
          type="button"
          className="mt-4 bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Select HTML File
        </button>
       )}
    </div>
  );
};
