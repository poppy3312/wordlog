# WordLog 代码审查 Checklist

## 版本发布前检查

- [ ] **版本号同步**
  - [ ] `web-app/src/config/version.js`
  - [ ] `web-app/package.json`
  - [ ] `CHANGELOG.md`
  - [ ] `ChangelogModal.jsx` 中的更新记录

- [ ] **自动化测试**
  - [ ] 运行 `npm run test:run` 确保所有测试通过
  - [ ] 运行 `npm run test:coverage` 检查覆盖率 > 85%
  - [ ] 新功能添加对应测试用例

- [ ] **功能测试**
  - [ ] 添加单词功能正常
  - [ ] 点击例句单词添加功能正常
  - [ ] ESC 键关闭所有弹窗
  - [ ] 导出功能（TXT/CSV/MD）
  - [ ] 刷新释义功能
  - [ ] 配图导入功能

- [ ] **UI 检查**
  - [ ] 浅色模式显示正常
  - [ ] 深色模式显示正常
  - [ ] 弹窗遮罩层覆盖完整
  - [ ] 嵌套弹窗层级正确

- [ ] **代码质量**
  - [ ] 无 console.error 或 console.warn
  - [ ] 组件 Props 类型正确
  - [ ] 事件处理函数正确绑定
  - [ ] 状态更新逻辑正确

## 修改代码时检查

### 修改组件后
- [ ] **数据结构**
  - [ ] Props 传递的数据类型正确
  - [ ] Store 中的数据对象包含所有必需字段
  - [ ] 数组/对象操作前做了判空

- [ ] **事件处理**
  - [ ] onClick 等事件正确绑定
  - [ ] 事件处理函数用 useCallback 包裹（如果需要）
  - [ ] 清理 effect 的副作用

- [ ] **UI/UX**
  - [ ] 主题变量（theme）正确传递
  - [ ] 暗色模式样式适配
  - [ ] 响应式布局（移动端）

### 修改 store 后
- [ ] **数据模型**
  - [ ] Word 对象包含所有必需字段：id, word, wordLower, definitions, createdAt
  - [ ] 新增字段有默认值
  - [ ] localStorage/chromeStorage 同步

### 添加新功能后
- [ ] **更新文档**
  - [ ] README.md 功能列表
  - [ ] CHANGELOG.md 添加版本记录
  - [ ] ChangelogModal.jsx 添加更新条目

## 已知问题规避

### 避免这些常见错误：
1. ❌ 传递字符串给需要对象的函数
   ```javascript
   // 错误
   addWord(wordDetail.word)

   // 正确
   addWord({ word: wordDetail.word, wordLower: ..., definitions: ... })
   ```

2. ❌ 嵌套弹窗在父组件内渲染
   ```javascript
   // 错误 - 遮罩层无法覆盖全屏
   return (
     <div className="parent-modal">
       {showChild && <ChildModal />}
     </div>
   )

   // 正确 - 使用 Fragment
   return (
     <>
       <div className="parent-modal">...</div>
       {showChild && <ChildModal />}
     </>
   )
   ```

3. ❌ Fragment 闭合标签遗漏
   ```javascript
   // 错误
   return ( <> <div /> );  // 缺少 </>

   // 正确
   return ( <> <div /> </> );
   ```
