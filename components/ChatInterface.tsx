import React, { useState, useEffect, useRef } from 'react';
import { type ChatMessage } from '../types';
import { SendIcon } from './icons';

interface ChatInterfaceProps {
  history: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ history, onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  const historyEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background rounded-lg border border-gray-600">
      {/* Chat History */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {history.map((chat, index) => (
            <div key={index} className={`flex ${chat.author === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  chat.author === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-on-surface'
                }`}
              >
                <p className="text-sm">{chat.text}</p>
              </div>
            </div>
          ))}
          {isLoading && history[history.length -1]?.author === 'user' && (
            <div className="flex justify-start">
                 <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-surface text-on-surface-secondary">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-medium"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-slow"></div>
                    </div>
                </div>
            </div>
          )}
        </div>
        <div ref={historyEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-2 border-t border-gray-600">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., 'Make all the text larger.'"
            className="flex-grow bg-surface border border-gray-500 text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5"
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="inline-flex justify-center p-2.5 rounded-full cursor-pointer text-white bg-primary hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <SendIcon />
            )}
            
          </button>
        </form>
      </div>
    </div>
  );
};
