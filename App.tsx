import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { HtmlUploader } from './components/HtmlUploader';
import { FigmaLinkUploader } from './components/FigmaLinkUploader';
import { UrlUploader } from './components/UrlUploader';
import { ModelSelector } from './components/ModelSelector';
import { ScriptSelector } from './components/ScriptSelector';
import { ScriptTypeSelector } from './components/ScriptTypeSelector';
import { CodeOutput } from './components/CodeOutput';
import { FileOutput } from './components/FileOutput';
import { Preview } from './components/Preview';
import { ChatInterface } from './components/ChatInterface';
import { ErrorMessage } from './components/ErrorMessage';
import { RefinementSuggestions } from './components/RefinementSuggestions';
import { generateCodeFromImage, generateCodeFromHtml, generateCodeFromFigma, generateCodeFromUrl, generateCodeFromContentAdoption, refineCode } from './services/geminiService';
import { AIIcon, CodeIcon, PreviewIcon } from './components/icons';
import { type ModelOption, type ScriptOption, type ScriptTypeOption, type GeneratedFile, type ChatMessage, type FigmaImport } from './types';
import { MODEL_OPTIONS, SCRIPT_OPTIONS, SCRIPT_TYPE_OPTIONS } from './constants';

type GeneratedOutput = string | GeneratedFile[] | null;
type InputMode = 'image' | 'html' | 'figma' | 'url' | 'content';
type AdoptionMode = 'improve' | 'strict';


const createPreviewHtmlFromFiles = (files: GeneratedFile[]): string | null => {
  const htmlFile = files.find(f => f.path.endsWith('index.html'));
  if (!htmlFile) return null;

  const cssFile = files.find(f => f.path.endsWith('.css'));
  const jsFile = files.find(f => f.path.endsWith('.js'));

  let htmlContent = htmlFile.content;

  if (cssFile) {
    const cssLinkRegex = /<link[^>]*?href=["']?([^"']+\.css)["']?[^>]*?>/i;
    if (cssLinkRegex.test(htmlContent)) {
      htmlContent = htmlContent.replace(cssLinkRegex, `<style>${cssFile.content}</style>`);
    } else {
      htmlContent = htmlContent.replace('</head>', `<style>${cssFile.content}</style></head>`);
    }
  }
  
  if (jsFile) {
    const jsLinkRegex = /<script[^>]*?src=["']?([^"']+\.js)["']?[^>]*?><\/script>/i;
     if (jsLinkRegex.test(htmlContent)) {
      htmlContent = htmlContent.replace(jsLinkRegex, `<script defer>${jsFile.content}</script>`);
    } else {
      htmlContent = htmlContent.replace('</body>', `<script defer>${jsFile.content}</script></body>`);
    }
  }

  return htmlContent;
};


const App: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>('image');
  const [outputView, setOutputView] = useState<'code' | 'preview'>('code');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[0]);
  const [selectedScript, setSelectedScript] = useState<ScriptOption>(SCRIPT_OPTIONS[0]);
  const [selectedScriptType, setSelectedScriptType] = useState<ScriptTypeOption>(SCRIPT_TYPE_OPTIONS[0]);
  const [uploadedImage, setUploadedImage] = useState<{ file: File; base64: string } | null>(null);
  const [uploadedHtml, setUploadedHtml] = useState<string | null>(null);
  const [figmaData, setFigmaData] = useState<FigmaImport | null>(null);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput>(null);
  const [refinementSuggestions, setRefinementSuggestions] = useState<string[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [contentToAdopt, setContentToAdopt] = useState<string>('');
  const [adoptionMode, setAdoptionMode] = useState<AdoptionMode>('improve');
  const loadingIntervalRef = useRef<number | null>(null);

  const isPreviewable = (typeof generatedOutput === 'string' && (selectedScript.id === 'html' || selectedScript.id === 'vanillajs' || inputMode === 'content')) ||
                        (Array.isArray(generatedOutput) && selectedScript.id === 'html-css-js');

  const isTypeScriptAvailable = !['html', 'vanillajs', 'html-css-js'].includes(selectedScript.id);
  
  const stopLoadingSequence = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      stopLoadingSequence();
    };
  }, [stopLoadingSequence]);

  useEffect(() => {
    if (!isPreviewable && outputView === 'preview') {
      setOutputView('code');
    }
  }, [isPreviewable, outputView]);
  
  useEffect(() => {
    if (!isTypeScriptAvailable && selectedScriptType.id === 'typescript') {
      setSelectedScriptType(SCRIPT_TYPE_OPTIONS[0]); // Reset to JavaScript
    }
  }, [selectedScript, isTypeScriptAvailable, selectedScriptType]);

  const handleSetInputMode = (mode: InputMode) => {
    if (mode !== inputMode) {
      setInputMode(mode);
      setUploadedImage(null);
      setUploadedHtml(null);
      setFigmaData(null);
      setInputUrl('');
      setContentToAdopt('');
      setError(null);
    }
  };

  const handleFigmaImport = (data: FigmaImport | null) => {
    setFigmaData(data);
    if (data) {
      setUploadedImage(data.image);
    } else {
      setUploadedImage(null);
    }
  };


  const handleGenerateCode = useCallback(async () => {
    setError(null);
    setGeneratedOutput(null);
    setChatHistory([]);
    setOutputView('code');
    setRefinementSuggestions([]);

    try {
      let result;
      const initialChat: ChatMessage[] = customPrompt ? [{ author: 'user', text: customPrompt }] : [];
      
      if (inputMode === 'figma' && figmaData) {
        setLoadingMessage('Generating code from Figma design...');
        result = await generateCodeFromFigma(
          selectedModel.id,
          figmaData.image.file.type,
          figmaData.image.base64,
          figmaData.node,
          customPrompt,
          selectedScript.name,
          selectedScriptType.name
        );
      } else if (inputMode === 'image' && uploadedImage) {
        setLoadingMessage('Analyzing design and generating code...');
        result = await generateCodeFromImage(
          selectedModel.id,
          uploadedImage.file.type,
          uploadedImage.base64,
          customPrompt,
          selectedScript.name,
          selectedScriptType.name
        );
      } else if (inputMode === 'html' && uploadedHtml) {
        setLoadingMessage('Refactoring HTML and generating code...');
        result = await generateCodeFromHtml(
          selectedModel.id,
          uploadedHtml,
          customPrompt,
          selectedScript.name,
          selectedScriptType.name
        );
      } else if (inputMode === 'url' && inputUrl) {
         const messages = [
            'Analyzing URL and page structure...',
            'Mapping assets and styles...',
            'Generating project files...',
            'Assembling the final code...'
          ];
          let messageIndex = 0;
          setLoadingMessage(messages[messageIndex]);

          loadingIntervalRef.current = window.setInterval(() => {
              messageIndex++;
              if (messageIndex < messages.length) {
                  setLoadingMessage(messages[messageIndex]);
              } else {
                  stopLoadingSequence();
              }
          }, 4000);

        result = await generateCodeFromUrl(
          selectedModel.id,
          inputUrl,
          customPrompt,
          selectedScript.name,
          selectedScriptType.name
        );
      } else if (inputMode === 'content' && uploadedHtml && contentToAdopt) {
        setLoadingMessage('Applying content and generating code...');
        result = await generateCodeFromContentAdoption(
            selectedModel.id,
            uploadedHtml,
            contentToAdopt,
            adoptionMode
        );
      } else {
        setError(`Please provide an input for the selected mode first.`);
        setLoadingMessage(null);
        return;
      }

      setGeneratedOutput(result.code);
      setRefinementSuggestions(result.suggestions);
      setChatHistory(initialChat);

      if ( (typeof result.code === 'string' && (selectedScript.id === 'html' || selectedScript.id === 'vanillajs' || inputMode === 'content')) || (Array.isArray(result.code) && selectedScript.id === 'html-css-js') ) {
        setOutputView('preview');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      stopLoadingSequence();
      setLoadingMessage(null);
    }
  }, [inputMode, uploadedImage, uploadedHtml, figmaData, inputUrl, contentToAdopt, adoptionMode, selectedModel, customPrompt, selectedScript, selectedScriptType, stopLoadingSequence]);
  
  const handleRefinement = useCallback(async (newMessage: string) => {
    if (!generatedOutput || !newMessage) return;

    setLoadingMessage('Refining the code...');
    setError(null);
    setRefinementSuggestions([]);
    const updatedHistory: ChatMessage[] = [...chatHistory, { author: 'user', text: newMessage }];
    setChatHistory(updatedHistory);

    try {
      const result = await refineCode(
        selectedModel.id,
        generatedOutput,
        updatedHistory,
        selectedScript.name,
        selectedScriptType.name
      );
      setGeneratedOutput(result.code);
      setRefinementSuggestions(result.suggestions);
      const aiResponse = result.response || 'I have updated the code based on your request.';
      setChatHistory([...updatedHistory, { author: 'ai', text: aiResponse }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setChatHistory([...updatedHistory, { author: 'ai', text: `Sorry, I encountered an error: ${errorMessage}` }]);
      console.error(err);
    } finally {
      setLoadingMessage(null);
    }
  }, [generatedOutput, chatHistory, selectedModel, selectedScript, selectedScriptType]);


  const isGenerationDisabled = 
    !!loadingMessage || 
    (inputMode === 'image' && !uploadedImage) || 
    (inputMode === 'html' && !uploadedHtml) ||
    (inputMode === 'figma' && !figmaData) ||
    (inputMode === 'url' && !inputUrl) || 
    (inputMode === 'content' && (!uploadedHtml || !contentToAdopt)) ||
    !!generatedOutput;

  const renderOutput = () => {
    if (!generatedOutput) return null;

    if (outputView === 'code') {
      if (typeof generatedOutput === 'string') {
        return <CodeOutput code={generatedOutput} />;
      }
      if (Array.isArray(generatedOutput)) {
        return <FileOutput files={generatedOutput} />;
      }
    }
    
    if (outputView === 'preview' && isPreviewable) {
        let previewCode: string | null = null;
        if (typeof generatedOutput === 'string') {
            previewCode = generatedOutput;
        } else if (Array.isArray(generatedOutput)) {
            previewCode = createPreviewHtmlFromFiles(generatedOutput);
        }

        if (previewCode) {
            return <Preview code={previewCode} />;
        }
    }

    return null;
  };
  
  const step2Title = {
    image: 'Upload Your Design',
    html: 'Upload Your HTML',
    figma: 'Import from Figma',
    url: 'Provide Webpage URL',
    content: 'Provide HTML & Content'
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Header />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 sm:p-8">
        {/* Input Panel */}
        <div className="flex flex-col bg-surface rounded-2xl shadow-lg p-6 space-y-6 h-full">
          <h2 className="text-2xl font-bold text-on-surface">1. Choose Input Type</h2>
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => handleSetInputMode('image')}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${inputMode === 'image' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-secondary hover:text-on-surface'}`}
              aria-pressed={inputMode === 'image'}
            >
              Image
            </button>
            <button
              onClick={() => handleSetInputMode('html')}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${inputMode === 'html' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-secondary hover:text-on-surface'}`}
              aria-pressed={inputMode === 'html'}
            >
              HTML
            </button>
             <button
              onClick={() => handleSetInputMode('content')}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${inputMode === 'content' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-secondary hover:text-on-surface'}`}
              aria-pressed={inputMode === 'content'}
            >
              Content
            </button>
            <button
              onClick={() => handleSetInputMode('figma')}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${inputMode === 'figma' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-secondary hover:text-on-surface'}`}
              aria-pressed={inputMode === 'figma'}
            >
              Figma
            </button>
             <button
              onClick={() => handleSetInputMode('url')}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${inputMode === 'url' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-secondary hover:text-on-surface'}`}
              aria-pressed={inputMode === 'url'}
            >
              URL
            </button>
          </div>

          <h2 className="text-2xl font-bold text-on-surface pt-4">2. {step2Title[inputMode]}</h2>
          {inputMode === 'image' && <ImageUploader onImageUpload={setUploadedImage} />}
          {inputMode === 'html' && <HtmlUploader onHtmlUpload={setUploadedHtml} />}
          {inputMode === 'figma' && <FigmaLinkUploader onFigmaImport={handleFigmaImport} />}
          {inputMode === 'url' && <UrlUploader onUrlChange={setInputUrl} />}
          {inputMode === 'content' && (
            <div className="space-y-4 flex-grow flex flex-col">
              <div>
                  <p className="text-sm text-on-surface-secondary mb-2">1. Upload the HTML file to use as a template.</p>
                  <div className="h-40">
                      <HtmlUploader onHtmlUpload={setUploadedHtml} />
                  </div>
              </div>
              <div className="flex-grow flex flex-col">
                  <p className="text-sm text-on-surface-secondary pt-2 mb-2">2. Provide the new content to apply.</p>
                  <textarea
                      value={contentToAdopt}
                      onChange={(e) => setContentToAdopt(e.target.value)}
                      placeholder="e.g., Page Title: Our Services. Section 1: We offer..."
                      className="w-full bg-background border border-gray-600 text-on-surface text-md rounded-lg focus:ring-primary focus:border-primary p-3 h-32 resize-y transition-colors flex-grow"
                      aria-label="New content to adopt"
                  />
              </div>
              <div>
                  <p className="text-sm text-on-surface-secondary pt-2 mb-2">3. Choose how the AI should apply the content.</p>
                  <div className="space-y-3">
                      <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                  type="radio" 
                                  name="adoptionMode" 
                                  value="improve" 
                                  checked={adoptionMode === 'improve'} 
                                  onChange={() => setAdoptionMode('improve')}
                                  className="h-4 w-4 text-primary bg-gray-700 border-gray-600 focus:ring-primary focus:ring-offset-background"
                              />
                              <span className="text-sm font-medium">Improve & Add</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                  type="radio" 
                                  name="adoptionMode" 
                                  value="strict" 
                                  checked={adoptionMode === 'strict'} 
                                  onChange={() => setAdoptionMode('strict')}
                                  className="h-4 w-4 text-primary bg-gray-700 border-gray-600 focus:ring-primary focus:ring-offset-background"
                              />
                              <span className="text-sm font-medium">Strict Content</span>
                          </label>
                      </div>
                      <p className="text-xs text-on-surface-secondary pl-1">
                          {adoptionMode === 'improve'
                              ? 'AI will fill in any gaps from the template using your content as inspiration.'
                              : 'AI will only use your content and remove template sections that are not covered.'}
                      </p>
                  </div>
              </div>
            </div>
          )}

          {inputMode !== 'content' && (
            <>
              <h2 className="text-2xl font-bold text-on-surface pt-4">3. Select AI Model</h2>
              <ModelSelector
                options={MODEL_OPTIONS}
                selected={selectedModel}
                onSelect={setSelectedModel}
              />

              <h2 className="text-2xl font-bold text-on-surface pt-4">4. Select Output Format</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScriptSelector
                  options={SCRIPT_OPTIONS}
                  selected={selectedScript}
                  onSelect={setSelectedScript}
                />
                <ScriptTypeSelector
                  options={SCRIPT_TYPE_OPTIONS}
                  selected={selectedScriptType}
                  onSelect={setSelectedScriptType}
                  disabled={!isTypeScriptAvailable}
                />
              </div>
            </>
          )}

          <div className="flex-grow flex flex-col min-h-[150px]">
            <h2 className="text-2xl font-bold text-on-surface pt-4 mb-4">5. {generatedOutput ? 'Refine with AI' : 'Add Custom Instructions (Optional)'}</h2>
            {generatedOutput ? (
              <div className="flex-grow flex flex-col">
                <ChatInterface
                  history={chatHistory}
                  onSendMessage={handleRefinement}
                  isLoading={!!loadingMessage}
                />
                <RefinementSuggestions
                  suggestions={refinementSuggestions}
                  onSuggestionClick={handleRefinement}
                  isLoading={!!loadingMessage}
                />
              </div>
            ) : (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., 'Make the primary button green', 'Use Vue.js and TypeScript'"
                className="w-full bg-background border border-gray-600 text-on-surface text-md rounded-lg focus:ring-primary focus:border-primary p-3 h-24 resize-y transition-colors flex-grow"
                aria-label="Custom instructions for the AI"
              />
            )}
          </div>
          

          <button
            onClick={handleGenerateCode}
            disabled={isGenerationDisabled}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            {!!loadingMessage && !generatedOutput ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <AIIcon />
                Generate Code
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-surface rounded-2xl shadow-lg p-6 h-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              {outputView === 'code' ? <CodeIcon /> : <PreviewIcon />}
              <h2 className="text-2xl font-bold text-on-surface">
                {outputView === 'code' ? 'Generated Output' : 'Live Preview'}
              </h2>
            </div>
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setOutputView('code')}
                className={`px-3 py-1 text-sm font-medium transition-colors duration-200 ${outputView === 'code' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-secondary hover:text-on-surface'}`}
                aria-pressed={outputView === 'code'}
              >
                Code
              </button>
              <button
                onClick={() => setOutputView('preview')}
                disabled={!isPreviewable}
                className={`px-3 py-1 text-sm font-medium transition-colors duration-200 ${outputView === 'preview' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-secondary hover:text-on-surface'} disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-pressed={outputView === 'preview'}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="flex-grow bg-background rounded-lg overflow-hidden h-[60vh] lg:h-auto">
            {loadingMessage && (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-secondary p-4 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-semibold">{loadingMessage}</p>
                <p>This may take a moment.</p>
              </div>
            )}
            {error && (
              <ErrorMessage message={error} />
            )}
            {!loadingMessage && !error && generatedOutput && renderOutput()}
            {!loadingMessage && !error && !generatedOutput && (
              <div className="flex items-center justify-center h-full text-on-surface-secondary">
                <p className="text-lg">Your generated project will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;