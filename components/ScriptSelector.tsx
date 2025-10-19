import React from 'react';
import { type ScriptOption } from '../types';

interface ScriptSelectorProps {
  options: ScriptOption[];
  selected: ScriptOption;
  onSelect: (option: ScriptOption) => void;
}

export const ScriptSelector: React.FC<ScriptSelectorProps> = ({ options, selected, onSelect }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = options.find(option => option.id === event.target.value);
    if (selectedOption) {
      onSelect(selectedOption);
    }
  };

  return (
    <div className="w-full">
      <select
        value={selected.id}
        onChange={handleChange}
        className="w-full bg-background border border-gray-600 text-on-surface text-md rounded-lg focus:ring-primary focus:border-primary p-3"
        aria-label="Select output script format"
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};
