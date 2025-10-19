
import React, { useState, useEffect } from 'react';
import { CopyIcon, CheckIcon, DownloadIcon } from './icons';

interface CodeOutputProps {
  code: string;
}

export const CodeOutput: React.FC<CodeOutputProps> = ({ code }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          onClick={handleDownload}
          className="p-2 bg-surface rounded-md text-on-surface-secondary hover:bg-gray-600 hover:text-on-surface transition-all duration-200"
          aria-label="Download file"
          title="Download file"
        >
          <DownloadIcon />
        </button>
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
        <code>{code}</code>
      </pre>
    </div>
  );
};