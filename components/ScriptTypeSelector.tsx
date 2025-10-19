import React from 'react';
import { type ScriptTypeOption } from '../types';

interface ScriptTypeSelectorProps {
  options: ScriptTypeOption[];
  selected: ScriptTypeOption;
  onSelect: (option: ScriptTypeOption) => void;
  disabled?: boolean;
}

export const ScriptTypeSelector: React.FC<ScriptTypeSelectorProps> = ({ options, selected, onSelect, disabled = false }) => {
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
        disabled={disabled}
        className="w-full bg-background border border-gray-600 text-on-surface text-md rounded-lg focus:ring-primary focus:border-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select script language"
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
