/**
 * Chrome API 类型声明
 */

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

export {};
