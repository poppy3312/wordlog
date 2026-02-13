# WordLog 测试指南

## 测试框架

- **测试运行器**: Vitest
- **组件测试**: React Testing Library
- **断言扩展**: Jest DOM
- **用户交互**: User Event

## 运行测试

```bash
# 运行所有测试（监听模式）
npm test

# 运行所有测试（一次性）
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试 UI 界面
npm run test:ui
```

## 测试文件结构

```
web-app/src/
├── store/
│   ├── useWordStore.js
│   └── useWordStore.test.js    # Store 测试
├── utils/
│   ├── export.js
│   └── export.test.js          # 工具函数测试
└── test/
    └── setup.js                # 测试环境配置
```

## 已有测试

### Store 测试 (`useWordStore.test.js`)

测试状态管理功能：

| 测试项 | 描述 |
|--------|------|
| 初始状态 | 验证初始 words、stats、theme |
| addWord | 添加新单词、更新已存在单词、返回状态 |
| deleteWord | 删除指定单词 |
| clearAll | 清空所有单词 |
| setWords | 设置单词列表并更新统计 |
| setTheme | 设置主题 |

### 导出功能测试 (`export.test.js`)

测试导出功能：

| 测试项 | 描述 |
|--------|------|
| TXT 格式 | 纯文本导出、每行一个单词 |
| CSV 格式 | CSV 导出、BOM、表头、双引号转义 |
| Markdown 格式 | Markdown 导出、日期分组、排序 |
| 错误处理 | 不支持格式抛出错误 |

## 编写新测试

### 1. 组件测试模板

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('应该渲染组件', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('应该响应用户交互', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### 2. 工具函数测试模板

```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFile';

describe('myFunction', () => {
  it('应该返回正确结果', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('应该处理边界情况', () => {
    expect(myFunction(null)).toBe(null);
    expect(myFunction('')).toBe('');
  });
});
```

### 3. Store 测试模板

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { useWordStore } from './useWordStore';

describe('useWordStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useWordStore.setState({ /* 初始状态 */ });
  });

  it('应该执行操作', () => {
    const { action } = useWordStore.getState();
    action();
    const { state } = useWordStore.getState();
    expect(state).toBe('expected');
  });
});
```

## 测试覆盖率目标

| 类型 | 目标覆盖率 |
|------|-----------|
| Store | 100% |
| 工具函数 | 100% |
| 组件 | 80%+ |
| 整体 | 85%+ |

## Mock 配置

### localStorage

```javascript
global.localStorage = {
  getItem: vitest.fn(),
  setItem: vitest.fn(),
  removeItem: vitest.fn(),
  clear: vitest.fn(),
};
```

### Chrome Storage API

```javascript
global.chrome = {
  storage: {
    local: {
      get: vitest.fn(),
      set: vitest.fn(),
    },
  },
};
```

### Web Speech API

```javascript
global.speechSynthesis = {
  speak: vitest.fn(),
  cancel: vitest.fn(),
  // ...
};
```

## 最佳实践

1. **测试隔离**
   - 每个测试独立运行
   - 使用 `beforeEach` 重置状态
   - 避免测试间依赖

2. **描述性测试名称**
   ```javascript
   // 好的测试名称
   it('当添加已存在的单词时，应该更新释义')

   // 不好的测试名称
   it('测试 addWord')
   ```

3. **测试用户行为而非实现细节**
   ```javascript
   // 好的测试
   it('点击按钮后应该显示弹窗')

   // 不好的测试
   it('setState 后 showModal 应该为 true')
   ```

4. **使用 screen 查询**
   ```javascript
   // 好的做法
   screen.getByRole('button')
   screen.getByText('添加单词')

   // 避免
   container.querySelector('.btn-primary')
   ```

## 待编写的测试

- [ ] `AddWordModal.test.js` - 添加单词弹窗
- [ ] `SettingsModal.test.js` - 设置弹窗
- [ ] `ChangelogModal.test.js` - 更新记录弹窗
- [ ] `WordDetailModal.test.js` - 单词详情弹窗
- [ ] `WordCard.test.js` - 单词卡片
- [ ] `WordList.test.js` - 主页面
- [ ] `chromeStorage.test.js` - Chrome 存储工具
