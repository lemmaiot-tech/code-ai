
import React from 'react';
import { type ModelOption } from '../types';

interface ModelSelectorProps {
  options: ModelOption[];
  selected: ModelOption;
  onSelect: (option: ModelOption) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ options, selected, onSelect }) => {
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
