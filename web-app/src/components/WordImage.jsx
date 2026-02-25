import React, { useState } from 'react';

/**
 * 单词配图组件 - 自动处理图片加载失败
 * @param {Object} props
 * @param {string} props.src - 图片 URL
 * @param {string} props.alt - 图片描述
 * @param {string} props.keyword - 加载失败时显示的关键词
 * @param {string} props.className - 样式类名
 * @param {string} props.theme - 主题（dark/light）
 * @param {Function} props.onClick - 点击回调
 */
function WordImage({ src, alt, keyword, className = '', theme, onClick, ...props }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 检查 src 是否有效
  const isValidSrc = src && typeof src === 'string' && src.trim().length > 0;

  // 无有效图片或加载失败时显示关键词占位符
  if (!isValidSrc || hasError) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <span className={`text-lg font-bold text-primary truncate px-1 text-center ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>
          {keyword || (alt ? alt.charAt(0).toUpperCase() : '?')}
        </span>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={`flex items-center justify-center animate-pulse ${className}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            加载中...
          </span>
        </div>
      )}
      <img
        src={src}
        alt={alt || ''}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.warn(`[WordImage] 图片加载失败: ${src?.substring(0, 50)}...`);
          setHasError(true);
          setIsLoading(false);
        }}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        {...props}
      />
    </>
  );
}

export default WordImage;
