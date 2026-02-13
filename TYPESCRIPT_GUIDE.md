# WordLog TypeScript 迁移指南

## 迁移状态

### ✅ 已完成迁移

| 文件 | 状态 | 说明 |
|------|------|------|
| `tsconfig.json` | ✅ | TypeScript 配置 |
| `vite.config.ts` | ✅ | Vite 配置（支持 SWC） |
| `src/main.tsx` | ✅ | 入口文件 |
| `src/App.tsx` | ✅ | 主应用组件 |
| `src/types/index.ts` | ✅ | 全局类型定义 |
| `src/types/components.ts` | ✅ | 组件 Props 类型 |
| `src/store/useWordStore.ts` | ✅ | Zustand Store |
| `src/utils/export.ts` | ✅ | 导出功能 |
| `src/utils/chromeStorage.ts` | ✅ | Chrome 存储工具 |

### ⏳ 待迁移组件

| 文件 | 优先级 | 说明 |
|------|--------|------|
| `src/components/AddWordModal.jsx` | 高 | 添加单词弹窗 |
| `src/components/SettingsModal.jsx` | 高 | 设置弹窗 |
| `src/components/ChangelogModal.jsx` | 中 | 更新记录弹窗 |
| `src/components/WordDetailModal.jsx` | 高 | 单词详情弹窗 |
| `src/components/WordCard.jsx` | 中 | 单词卡片 |
| `src/components/Toast.jsx` | 低 | Toast 提示 |
| `src/pages/WordList.jsx` | 高 | 主页面 |
| `src/utils/dictionaryAPI.js` | 中 | 词典 API |

---

## 类型定义

### Word 类型

```typescript
interface Word {
  id: string;
  word: string;
  wordLower: string;
  pronunciation?: string;
  definitions: Definition[];
  imageUrl?: string | string[];
  audioUrl?: string;
  createdAt: number;
  updatedAt?: number;
  source?: string;
  keyword?: string;
}
```

### Definition 类型

```typescript
interface Definition {
  partOfSpeech: string;
  definition: string;
  example?: string;
  phonetic?: string;
}
```

### Theme 类型

```typescript
type Theme = 'light' | 'dark';
```

### ExportFormat 类型

```typescript
type ExportFormat = 'txt' | 'csv' | 'md';
```

---

## 组件迁移步骤

### 1. 重命名文件

```bash
# 重命名 .jsx 为 .tsx
mv ComponentName.jsx ComponentName.tsx
```

### 2. 添加 Props 类型

```typescript
// 从 @/types/components 导入类型
import type { ComponentNameProps } from '@/types/components';

// 或者内联定义
interface ComponentNameProps {
  title: string;
  onClose: () => void;
  theme: Theme;
}
```

### 3. 添加函数组件类型

```typescript
function ComponentName({ title, onClose, theme }: ComponentNameProps) {
  // 组件实现
}

export default ComponentName;
```

### 4. 处理事件处理器

```typescript
// 正确的事件类型
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.stopPropagation();
  onClose();
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

### 5. 处理 ref

```typescript
import { useRef } from 'react';

const inputRef = useRef<HTMLInputElement>(null);

inputRef.current?.focus();
```

### 6. 处理 useState

```typescript
// 基本类型
const [count, setCount] = useState<number>(0);
const [name, setName] = useState<string>('');

// 对象类型
const [user, setUser] = useState<User | null>(null);

// 数组类型
const [items, setItems] = useState<Item[]>([]);
```

### 7. 处理 useEffect

```typescript
useEffect(() => {
  const fetchData = async () => {
    const data = await fetchWord();
    setState(data);
  };
  fetchData();
}, []); // 依赖项类型自动推断
```

---

## 常见类型问题

### 1.children 类型

```typescript
// React 18+ 使用 ReactNode
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
```

### 2. 样式对象

```typescript
const style: React.CSSProperties = {
  color: 'red',
  fontSize: 16
};
```

### 3. 可选链和空值合并

```typescript
// word?.pronunciation 自动推断为 string | undefined
const pronunciation = word?.pronunciation || '暂无';
```

### 4. 类型断言

```typescript
// 确定元素存在时使用非空断言
const element = document.getElementById('root')!;

// 类型断言
const word = data as Word;
```

---

## VS Code 配置

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## 编译检查

```bash
# 类型检查
npx tsc --noEmit

# 构建
npm run build

# 开发
npm run dev
```

---

## 最佳实践

1. **优先使用类型导入**
   ```typescript
   import type { Word, Theme } from '@/types';
   ```

2. **避免 any**
   ```typescript
   // ❌ 避免
   const data: any = fetchData();

   // ✅ 使用 unknown 或具体类型
   const data: Word[] = fetchData();
   ```

3. **使用类型守卫**
   ```typescript
   function isWord(obj: unknown): obj is Word {
     return typeof obj === 'object' && obj !== null && 'word' in obj;
   }
   ```

4. **为回调函数添加类型**
   ```typescript
   const onClick = (callback: () => void) => {
     callback();
   };
   ```
