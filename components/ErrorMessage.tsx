import React from 'react';
import { WarningIcon } from './icons';

interface ErrorMessageProps {
  message: string;
}

const getGuidanceFromError = (message: string): string => {
    const lowerCaseMessage = message.toLowerCase();
    if (lowerCaseMessage.includes('api_key') || lowerCaseMessage.includes('api key')) {
        return 'Please ensure your API key is correctly configured as an environment variable. It might be invalid, expired, or missing required permissions.';
    }
    if (lowerCaseMessage.includes('figma api error') || lowerCaseMessage.includes('figma url')) {
        return 'Please check your Figma URL and Personal Access Token. Ensure the URL points to a specific frame and the token has read access to the file.';
    }
    if (lowerCaseMessage.includes('network') || lowerCaseMessage.includes('failed to fetch')) {
        return 'A network error occurred. Please check your internet connection and try again.';
    }
    if (lowerCaseMessage.includes('safety filter')) {
        return 'The response was blocked by the AI\'s safety filters. Try rephrasing your prompt or using a different design.';
    }
    if (lowerCaseMessage.includes('json')) {
        return 'The AI returned an invalid format. This can sometimes happen with complex requests. Please try generating again.';
    }
    return 'If the issue persists, please try refreshing the page or using a different input.';
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
    const guidance = getGuidanceFromError(message);

    return (
        <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center">
            <WarningIcon />
            <p className="mt-4 text-lg font-semibold">{message}</p>
            {guidance && <p className="mt-2 text-sm text-red-300">{guidance}</p>}
        </div>
    );
};
