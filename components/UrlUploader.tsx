import React, { useState } from 'react';
import { LinkIcon } from './icons';

interface UrlUploaderProps {
  onUrlChange: (url: string) => void;
}

const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export const UrlUploader: React.FC<UrlUploaderProps> = ({ onUrlChange }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (!newUrl) {
      setError(null);
      onUrlChange('');
      return;
    }

    if (URL_REGEX.test(newUrl)) {
      setError(null);
      onUrlChange(newUrl);
    } else {
      setError('Please enter a valid URL format (e.g., https://example.com)');
      onUrlChange(''); // Pass empty string to disable parent's generate button
    }
  };

  return (
    <div className="flex-grow flex flex-col space-y-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <LinkIcon />
        </div>
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com"
          className={`w-full bg-background border text-on-surface text-md rounded-lg focus:ring-primary focus:border-primary p-3 pl-10 transition-colors ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-600'
          }`}
          aria-label="Webpage URL"
          aria-invalid={!!error}
          aria-describedby="url-error"
        />
      </div>
      {error && <p id="url-error" className="text-red-400 text-sm px-1">{error}</p>}
      <div className="flex-grow flex items-center justify-center text-center text-on-surface-secondary p-4 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800">
        <p>The AI will analyze the provided URL and attempt to recreate its structure and style. Results may vary based on site complexity.</p>
      </div>
    </div>
  );
};
