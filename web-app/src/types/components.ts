/**
 * 组件 Props 类型定义
 */
import type { Theme, Word } from './index';

// ==================== 基础组件 Props ====================

// Toast Props
export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

// ==================== 弹窗组件 Props ====================

// AddWordModal Props
export interface AddWordModalProps {
  onClose: () => void;
  onAdd: (word: string) => Promise<void>;
  existingWords: Word[];
  theme: Theme;
}

// SettingsModal Props
export interface SettingsModalProps {
  onClose: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
  onRefreshDefinitions: () => Promise<void>;
  onExport: (format: string) => Promise<void>;
}

// ChangelogModal Props
export interface ChangelogModalProps {
  onClose: () => void;
  theme: Theme;
}

// WordDetailModal Props
export interface WordDetailModalProps {
  word: Word;
  onClose: () => void;
  onDelete: (wordId: string) => void;
  onRefresh: (wordId: string) => Promise<void>;
  showToast: (type: 'success' | 'error', message: string) => void;
  theme: Theme;
}

// ==================== 卡片组件 Props ====================

// WordCard Props
export interface WordCardProps {
  word: Word;
  onClick: () => void;
  onDelete: (wordId: string) => void;
  theme: Theme;
}

// ==================== 页面组件 Props ====================

// WordList Props（目前没有外部 props，但保留扩展性）
export interface WordListProps {
  // 未来可以添加路由、筛选等 props
}

// ==================== 工具函数类型 ====================

// 导出结果
export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}
