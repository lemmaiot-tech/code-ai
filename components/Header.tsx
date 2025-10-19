
import React from 'react';
import { ContentToCodeIcon } from './ContentToCodeIcon';

export const Header: React.FC = () => {
  return (
    <header className="bg-surface shadow-md p-4 flex items-center justify-center sm:justify-start">
      <div className="flex items-center gap-3">
        <ContentToCodeIcon />
        <h1 className="text-2xl font-bold text-on-surface">
          Content to Code <span className="text-primary">AI</span>
        </h1>
      </div>
    </header>
  );
};