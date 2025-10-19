import React from 'react';
import { AIIcon } from './icons';

interface RefinementSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  isLoading: boolean;
}

export const RefinementSuggestions: React.FC<RefinementSuggestionsProps> = ({ suggestions, onSuggestionClick, isLoading }) => {
  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mt-4 p-1">
      <h3 className="text-sm font-semibold text-on-surface-secondary mb-3 flex items-center gap-2">
        <AIIcon />
        Refinement Suggestions
      </h3>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-surface border border-gray-600 rounded-full text-sm text-on-surface hover:bg-gray-700 hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
         {isLoading && suggestions.length === 0 && (
            <div className="flex items-center space-x-2 text-sm text-on-surface-secondary">
                <span>Generating suggestions...</span>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-medium"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-slow"></div>
            </div>
         )}
      </div>
    </div>
  );
};
