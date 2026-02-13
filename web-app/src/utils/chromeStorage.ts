/**
 * Chrome Storage API 工具函数
 * 用于在 Web 应用中与 Chrome 扩展的存储同步
 */
import type { Word, Stats } from '../types';

/// <reference types="../types/chrome" />

interface StorageData {
  words: Word[] | null;
  stats: Stats | null;
  settings?: Record<string, unknown>;
}

/**
 * 从 Chrome Storage 加载数据
 * @returns 存储的数据
 */
export async function loadFromChromeStorage(): Promise<StorageData> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      // 非 Chrome 环境，返回空数据
      resolve({ words: null, stats: null });
      return;
    }

    chrome.storage.local.get(['words', 'stats', 'settings'], (result: StorageData) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * 保存数据到 Chrome Storage
 * @param words - 单词数组
 * @returns Promise<void>
 */
export async function saveToChromeStorage(words: Word[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      // 非 Chrome 环境，不执行保存
      resolve();
      return;
    }

    // 计算统计信息
    const stats: Stats = {
      totalWords: words.length,
      uniqueWords: new Set(words.map(w => w.wordLower)).size,
      todayAdded: words.filter(w =>
        new Date(w.createdAt).toDateString() === new Date().toDateString()
      ).length
    };

    const wordSet = words.map(w => w.wordLower);

    chrome.storage.local.set(
      {
        words: words,
        wordSet: wordSet,
        stats: stats
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * 监听 Chrome Storage 变化
 * @param callback - 回调函数
 */
export function watchChromeStorage(callback: (words: Word[]) => void): void {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName: string) => {
    if (areaName === 'local' && changes.words) {
      callback(changes.words.newValue as Word[]);
    }
  });
}

/** 防抖保存：多次连续更新只触发一次写入，减少存储压力 */
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWords: Word[] | null = null;
const SAVE_DEBOUNCE_MS = 400;

/**
 * 防抖保存单词列表（添加/删除/移动等操作后调用，避免短时间多次写入）
 * 需要立即落盘时请使用 saveToChromeStorage
 */
export function debouncedSaveWords(words: Word[]): void {
  pendingWords = words;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    const toSave = pendingWords;
    pendingWords = null;
    if (toSave === null) return;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      saveToChromeStorage(toSave).catch((err) =>
        console.error('防抖保存到 Chrome Storage 失败:', err)
      );
    } else {
      try {
        localStorage.setItem('wordlog_words', JSON.stringify(toSave));
      } catch (e) {
        console.error('防抖保存到 localStorage 失败:', e);
      }
    }
  }, SAVE_DEBOUNCE_MS);
}

/** 立即执行尚未触发的防抖保存（如页面卸载前可调用） */
export function flushDebouncedSave(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  if (pendingWords !== null) {
    const toSave = pendingWords;
    pendingWords = null;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      saveToChromeStorage(toSave).catch(() => {});
    } else {
      try {
        localStorage.setItem('wordlog_words', JSON.stringify(toSave));
      } catch {}
    }
  }
}
