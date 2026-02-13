import React from 'react';

function LoadingSkeleton({ theme }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={`p-5 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        >
          {/* 单词标题骨架 */}
          <div className="h-6 w-24 skeleton rounded mb-3"></div>

          {/* 词性标签骨架 */}
          <div className="h-5 w-16 skeleton rounded mb-2"></div>

          {/* 释义骨架 */}
          <div className="space-y-2">
            <div className="h-4 w-full skeleton rounded"></div>
            <div className="h-4 w-3/4 skeleton rounded"></div>
          </div>

          {/* 底部信息骨架 */}
          <div className="mt-4 h-3 w-20 skeleton rounded"></div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
