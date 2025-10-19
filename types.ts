export interface ModelOption {
  id: string;
  name: string;
}

export interface ScriptOption {
  id: string;
  name: string;
}

export interface ScriptTypeOption {
  id: string;
  name: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ChatMessage {
  author: 'user' | 'ai';
  text: string;
}

export interface FigmaImport {
  image: {
    file: File;
    base64: string;
  };
  node: any; // Figma node structure can be complex, using 'any' for simplicity
}

export interface GenerationResult {
  code: string | GeneratedFile[];
  suggestions: string[];
  response?: string;
}