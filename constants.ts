import { type ModelOption, type ScriptOption, type ScriptTypeOption } from './types';

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  // In a real scenario, more models could be added here.
  // For now, we focus on the best multi-modal model for the task.
];

export const SCRIPT_OPTIONS: ScriptOption[] = [
    { id: 'html-css-js', name: 'HTML + CSS + JS' },
    { id: 'html', name: 'HTML + Tailwind CSS' },
    { id: 'react', name: 'React + Tailwind CSS' },
    { id: 'vue', name: 'Vue + Tailwind CSS' },
    { id: 'svelte', name: 'Svelte + Tailwind CSS' },
    { id: 'angular', name: 'Angular + Tailwind CSS' },
    { id: 'vanillajs', name: 'Vanilla JS + Tailwind CSS' },
];

export const SCRIPT_TYPE_OPTIONS: ScriptTypeOption[] = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
];
