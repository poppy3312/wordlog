import React from 'react';
import { BookOpen, Plus } from 'lucide-react';

function EmptyState({ theme }) {
  return (
    <div className="text-center py-16 px-4">
      {/* 图标 */}
      <div className="flex justify-center mb-6">
        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <BookOpen className={`w-16 h-16 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-400'}`} />
        </div>
      </div>

      {/* 标题 */}
      <h2 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
        还没有收藏任何单词
      </h2>

      {/* 描述 */}
      <p className={`text-sm mb-6 max-w-md mx-auto ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
        使用 Chrome 扩展在浏览网页时快速添加单词，或点击下方按钮添加测试单词
      </p>

      {/* 使用说明 */}
      <div className={`max-w-sm mx-auto p-4 rounded-lg border mb-6 text-left ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
          快捷键：
        </h3>
        <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><kbd className="px-1.5 py-0.5 text-xs bg-gray-200 rounded">Control+W</kbd> 添加单词</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><kbd className="px-1.5 py-0.5 text-xs bg-gray-200 rounded">Command+R</kbd> 刷新释义</span>
          </li>
        </ul>
      </div>

      {/* 提示 */}
      <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
        💡 释义会自动从词典 API 获取
      </p>
    </div>
  );
}

export default EmptyState;
