
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { type GeneratedFile } from '../types';
import { FileTree } from './FileTree';
import { CopyIcon, CheckIcon, DownloadIcon } from './icons';

interface FileOutputProps {
  files: GeneratedFile[];
}

export const FileOutput: React.FC<FileOutputProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // Automatically select the first file when the component loads or files change
    if (files && files.length > 0) {
      // Prioritize common entry points
      const entryPoints = ['src/App.tsx', 'src/main.tsx', 'src/App.jsx', 'src/main.js', 'index.html'];
      let foundEntryPoint = false;
      for (const entry of entryPoints) {
        const file = files.find(f => f.path === entry);
        if (file) {
          setSelectedFile(file);
          foundEntryPoint = true;
          break;
        }
      }
      if (!foundEntryPoint) {
        setSelectedFile(files[0]);
      }
    } else {
      setSelectedFile(null);
    }
  }, [files]);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleSelectFile = (path: string) => {
    const file = files.find(f => f.path === path);
    if (file) {
      setSelectedFile(file);
      setIsCopied(false); // Reset copy status on file change
    }
  };

  const copyToClipboard = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(selectedFile.content);
      setIsCopied(true);
    }
  };
  
  const handleDownloadZip = async () => {
    if (!files || files.length === 0) return;

    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.path, file.content);
    });

    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate zip file:", error);
      alert("An error occurred while creating the zip file.");
    }
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-4">
      {/* File Tree Panel */}
      <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col border border-gray-700 rounded-lg">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-on-surface">File Explorer</h3>
            <button 
                onClick={handleDownloadZip}
                className="flex items-center text-sm bg-gray-700 text-on-surface-secondary px-2 py-1 rounded-md hover:bg-gray-600 transition-colors"
                title="Download project as .zip"
            >
                <DownloadIcon />
                Zip
            </button>
        </div>
        <div className="flex-grow p-2 overflow-y-auto">
          <FileTree files={files} selectedPath={selectedFile?.path || null} onSelect={handleSelectFile} />
        </div>
      </div>
      
      {/* Code Viewer Panel */}
      <div className="w-full md:w-2/3 lg:w-3/4 h-full relative border border-gray-700 rounded-lg">
        {selectedFile ? (
          <>
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <span className="text-sm text-on-surface-secondary bg-surface px-2 py-1 rounded-md">{selectedFile.path}</span>
                <button
                    onClick={copyToClipboard}
                    className="p-2 bg-surface rounded-md text-on-surface-secondary hover:bg-gray-600 hover:text-on-surface transition-all duration-200"
                    aria-label="Copy code to clipboard"
                    title="Copy code"
                >
                    {isCopied ? <CheckIcon /> : <CopyIcon />}
                </button>
            </div>
            <pre className="h-full w-full overflow-auto p-4 pt-12 rounded-lg code-viewer">
              <code>{selectedFile.content}</code>
            </pre>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-secondary">
            <p>Select a file to view its content.</p>
          </div>
        )}
      </div>
    </div>
  );
};