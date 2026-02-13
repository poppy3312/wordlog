/**
 * 未迁移模块的类型声明
 */
import type { Theme, Word, Stats } from './index';

// Chrome API - 必须在 global 声明之前
interface ChromeStorageArea {
  get: (keys: string[] | null, callback?: (result: Record<string, unknown>) => void) => void;
  set: (items: Record<string, unknown>, callback?: () => void) => void;
}

interface ChromeStorageOnChanged {
  addListener: (callback: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void) => void;
}

interface ChromeStorage {
  local: ChromeStorageArea;
  onChanged: ChromeStorageOnChanged;
}

interface ChromeRuntime {
  lastError: Error | null;
}

interface Chrome {
  storage?: ChromeStorage;
  runtime?: ChromeRuntime;
}

declare const chrome: Chrome;

declare global {
  interface Window {
    chrome?: Chrome;
  }
}

// WordList component
declare module './pages/WordList' {
  interface WordListProps {
    searchQuery: string;
    showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  }
  const WordList: React.FC<WordListProps>;
  export default WordList;
}

// SettingsModal component
declare module './components/SettingsModal' {
  interface SettingsModalProps {
    onClose: () => void;
    showToast: (type: 'success' | 'error' | 'info', message: string) => void;
    onRefreshDefinitions: () => Promise<void>;
    onExport: (format: string) => Promise<void>;
  }
  const SettingsModal: React.FC<SettingsModalProps>;
  export default SettingsModal;
}

// AddWordModal component
declare module './components/AddWordModal' {
  interface AddWordModalProps {
    onClose: () => void;
    onAdd: (word: string) => Promise<void>;
    existingWords: Word[];
    theme: Theme;
  }
  const AddWordModal: React.FC<AddWordModalProps>;
  export default AddWordModal;
}

// Toast component
declare module './components/Toast' {
  interface ToastProps {
    type: 'success' | 'error' | 'info';
    message: string;
  }
  const Toast: React.FC<ToastProps>;
  export default Toast;
}

// dictionaryAPI
declare module './utils/dictionaryAPI' {
  interface WordData {
    word: string;
    wordLower: string;
    pronunciation?: string;
    audioUrl?: string;
    imageUrl?: string;
    definitions: Definition[];
    source?: string;
  }
  interface Definition {
    partOfSpeech: string;
    definition: string;
    example?: string;
    exampleTranslation?: string;
  }
  function fetchWordDefinition(word: string): Promise<WordData>;
  function batchFetchDefinitions(words: Word[]): Promise<Word[]>;
  export { fetchWordDefinition, batchFetchDefinitions };
}

// version config
declare module './config/version' {
  const VERSION: {
    major: number;
    minor: number;
    patch: number;
    build: string;
    name: string;
    fullVersion: string;
    description: string;
  };
  export default VERSION;
}

export {};
