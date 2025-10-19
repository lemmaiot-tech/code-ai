import React, { useState, useEffect } from 'react';
import { LinkIcon, WarningIcon } from './icons';
import { type FigmaImport } from '../types';
import { fetchFigmaData } from '../services/figmaService';

interface FigmaLinkUploaderProps {
  onFigmaImport: (data: FigmaImport | null) => void;
}

export const FigmaLinkUploader: React.FC<FigmaLinkUploaderProps> = ({ onFigmaImport }) => {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [saveToken, setSaveToken] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('figma_personal_access_token');
    if (savedToken) {
      setFigmaToken(savedToken);
    }
  }, []);

  const handleSaveTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setSaveToken(isChecked);
    if (!isChecked) {
      // Immediately remove the token if the user unchecks the box
      localStorage.removeItem('figma_personal_access_token');
    }
  };
  
  const handleFetchDesign = async () => {
    setError(null);
    setPreview(null);
    onFigmaImport(null);

    if (!figmaUrl) {
      setError('Please provide a Figma URL.');
      return;
    }
    if (!figmaToken) {
      setError('Please provide a Figma Personal Access Token.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await fetchFigmaData(figmaUrl, figmaToken);
      setPreview(result.preview);
      onFigmaImport({
        image: result.image,
        node: result.node,
      });

      // Save the token on successful fetch if user consented
      if (saveToken) {
        localStorage.setItem('figma_personal_access_token', figmaToken);
      } else {
        localStorage.removeItem('figma_personal_access_token');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to fetch design: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex-grow flex flex-col space-y-4">
       <div>
        <label htmlFor="figma-url" className="block mb-2 text-sm font-medium text-on-surface-secondary">Figma File URL (with node-id)</label>
        <input
          type="url"
          id="figma-url"
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          placeholder="https://www.figma.com/file/..."
          className="w-full bg-background border border-gray-600 text-on-surface text-md rounded-lg focus:ring-primary focus:border-primary p-3"
        />
      </div>
       <div>
        <label htmlFor="figma-token" className="block mb-2 text-sm font-medium text-on-surface-secondary">Figma Personal Access Token</label>
        <input
          type="password"
          id="figma-token"
          value={figmaToken}
          onChange={(e) => setFigmaToken(e.target.value)}
          placeholder="figd_..."
          className="w-full bg-background border border-gray-600 text-on-surface text-md rounded-lg focus:ring-primary focus:border-primary p-3"
        />
        <p className="mt-2 text-xs text-gray-400">
            Your token is used for this request and not stored unless you consent below. 
            <a href="https://www.figma.com/developers/api#personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                How to get a token?
            </a>
        </p>
        <div className="flex items-center mt-3">
          <input
            id="save-token"
            type="checkbox"
            checked={saveToken}
            onChange={handleSaveTokenChange}
            className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-offset-background focus:ring-2"
          />
          <label htmlFor="save-token" className="ml-2 text-sm font-medium text-on-surface-secondary">
            Save token in browser for future use
          </label>
        </div>
      </div>

       <button
        onClick={handleFetchDesign}
        disabled={isLoading || !figmaUrl || !figmaToken}
        className="w-full flex items-center justify-center gap-3 bg-primary text-white font-bold py-2.5 px-5 rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Fetching Design...
          </>
        ) : (
          <>
            <LinkIcon />
            Fetch Design
          </>
        )}
      </button>

      <div className="flex-grow flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-600 rounded-lg bg-gray-800 min-h-[200px]">
        {isLoading && (
             <div className="flex flex-col items-center justify-center h-full text-on-surface-secondary">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="font-semibold">Importing from Figma...</p>
             </div>
        )}
        {error && (
            <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center">
                <WarningIcon />
                <p className="mt-3 text-sm font-semibold">{error}</p>
            </div>
        )}
        {preview && !error && !isLoading && (
            <img src={preview} alt="Figma Design Preview" className="object-contain h-full w-full max-h-80 rounded-lg p-2" />
        )}
         {!preview && !error && !isLoading && (
            <div className="text-center text-on-surface-secondary px-4">
                <p>Your fetched design preview will appear here.</p>
            </div>
         )}
      </div>

    </div>
  );
};