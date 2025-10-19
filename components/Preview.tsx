import React, { useState, useMemo, useEffect } from 'react';
import { DesktopIcon, TabletIcon, MobileIcon, WarningIcon } from './icons';

const viewports = {
  mobile: { width: '375px', height: '667px' },
  tablet: { width: '768px', height: '1024px' },
  desktop: { width: '100%', height: '100%' },
};

type Viewport = keyof typeof viewports;

interface PreviewProps {
  code: string;
}

// This script is injected into the iframe to catch errors and report them back to the parent window.
const errorHandlingScript = `
<script>
  window.onerror = function(message, source, lineno, colno, error) {
    window.parent.postMessage({
      type: 'previewError',
      message: message
    }, '*');
    return true; // Prevents the browser's default error console reporting.
  };
  window.addEventListener('unhandledrejection', function(event) {
    window.parent.postMessage({
      type: 'previewError',
      message: 'Unhandled promise rejection: ' + (event.reason ? event.reason.message : 'No reason provided')
    }, '*');
  });
<\/script>
`;

const injectScriptInHead = (html: string, script: string): string => {
  const headTag = /<head[^>]*>/i;
  if (headTag.test(html)) {
    return html.replace(headTag, `$&${script}`);
  }
  // Fallback if no head tag is found
  return `<html><head>${script}</head><body>${html}</body></html>`;
}


export const Preview: React.FC<PreviewProps> = ({ code }) => {
  const [viewport, setViewport] = useState<Viewport>(() => {
    const savedViewport = localStorage.getItem('previewViewport') as Viewport | null;
    return savedViewport && viewports[savedViewport] ? savedViewport : 'desktop';
  });
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('previewViewport', viewport);
  }, [viewport]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic security check: ensure the message is from the iframe we expect
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (event.data && event.data.type === 'previewError') {
        setPreviewError(event.data.message);
      }
    };
    
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const iframeCode = useMemo(() => {
    // Whenever the code changes, reset the error state and inject the error handler
    setPreviewError(null);
    return injectScriptInHead(code, errorHandlingScript);
  }, [code]);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const viewportStyle = {
    width: viewports[viewport].width,
    height: viewports[viewport].height,
  };
  
  const viewportOptions: {id: Viewport, icon: React.ReactNode, label: string}[] = [
    { id: 'mobile', icon: <MobileIcon />, label: 'Mobile' },
    { id: 'tablet', icon: <TabletIcon />, label: 'Tablet' },
    { id: 'desktop', icon: <DesktopIcon />, label: 'Desktop' },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="flex-shrink-0 bg-surface p-2 flex justify-center items-center gap-2 border-b border-gray-700">
        {viewportOptions.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setViewport(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewport === id
                ? 'bg-primary text-white'
                : 'text-on-surface-secondary hover:bg-gray-600 hover:text-on-surface'
            }`}
            aria-label={`Switch to ${label} view`}
            title={`${label} (${viewports[id].width} x ${viewports[id].height.replace('100%', 'auto')})`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      
      <div className="flex-grow flex justify-center items-start overflow-auto p-4">
        <div 
          className={`relative mx-auto bg-white shadow-lg transition-all duration-300 ease-in-out ${viewport !== 'desktop' ? 'border-4 my-4 border-gray-700 rounded-lg' : ''}`}
          style={viewportStyle}
        >
          {previewError && (
            <div className="absolute inset-0 bg-black bg-opacity-70 z-10 flex flex-col items-center justify-center text-center p-4">
               <div className="text-red-400">
                <WarningIcon />
               </div>
               <h3 className="mt-4 text-lg font-bold text-red-400">Preview Error</h3>
               <p className="mt-2 text-sm text-on-surface bg-surface rounded p-2 font-mono">{previewError}</p>
               <p className="mt-4 text-sm text-on-surface-secondary">
                The generated code has an error. Try using the chat to describe the issue and fix it. For example: "Fix the error: {previewError}"
               </p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            srcDoc={iframeCode}
            title="Live Preview"
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};
