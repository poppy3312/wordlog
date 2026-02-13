import React, { useState, useMemo } from 'react';
import { Volume2, Calendar, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { extractKeywordFromDefinition } from '../utils/dictionaryAPI';

function WordCard({ word, theme, onClick, onPlay, onCopy }) {
  // 图片轮播索引
  const [imageIndex, setImageIndex] = useState(0);
  const imageCount = word.imageUrl?.length || 0;

  // 切换到下一张图片
  const nextImage = (e) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev + 1) % imageCount);
  };

  // 切换到上一张图片
  const prevImage = (e) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
  };
  // 按词性分组释义，取前3个词性，每个词性最多2个简短释义
  const groupedDefinitions = useMemo(() => {
    if (!word.definitions || word.definitions.length === 0) return [];

    const groups = {};
    word.definitions.forEach(def => {
      const pos = def.partOfSpeech || '未知';
      if (!groups[pos]) {
        groups[pos] = [];
      }
      // 每个词性最多2个释义
      if (groups[pos].length < 2) {
        groups[pos].push(def);
      }
    });

    // 转换为数组并按词性排序（名词、动词、形容词等优先），取前3个词性
    const posOrder = ['名词', '动词', '形容词', '副词', '其他'];
    const sorted = Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length) // 释义多的优先
      .slice(0, 3);

    return sorted;
  }, [word.definitions]);

  const [copied, setCopied] = useState(false);

  // 播放发音
  const handlePlay = (e) => {
    e.stopPropagation();
    onPlay();
  };

  // 复制单词
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(word.word);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (onCopy) {
      onCopy();
    }
  };

  // 获取关键词
  const keyword = useMemo(() => {
    if (word.definitions && word.definitions[0]) {
      const definition = word.definitions[0].definition || '';
      const kw = extractKeywordFromDefinition(definition);
      if (kw) return kw;
    }
    return word.word.charAt(0).toUpperCase();
  }, [word.definitions, word.word]);

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer
        ${theme === 'dark'
          ? 'bg-gray-800 border-gray-700 hover:border-primary hover:shadow-md'
          : 'bg-white border-gray-200 hover:border-primary hover:shadow-md'
        }`}
      onClick={onClick}
    >
      <div className="flex items-stretch min-h-[120px] max-h-[140px]">
        {/* 配图/关键词显示区域 - 点击播放单词 */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className={`w-24 flex-shrink-0 flex items-center justify-center self-stretch cursor-pointer p-2 relative overflow-hidden
            ${theme === 'dark' ? 'bg-gradient-to-br from-primary/20 to-primary/10' : 'bg-gradient-to-br from-primary/10 to-primary/5'}
          `}
        >
          {word.imageUrl && word.imageUrl[0] ? (
            <>
              <img src={word.imageUrl[imageIndex]} alt={word.word} className="w-full h-full object-contain" />
              {/* 多张图片时显示切换按钮 */}
              {imageCount > 1 && (
                <>
                  <span className={`absolute bottom-1 right-1 text-[10px] px-1 rounded ${theme === 'dark' ? 'bg-gray-900/80 text-gray-300' : 'bg-white/80 text-gray-600'}`}>
                    {imageIndex + 1}/{imageCount}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-lg font-bold text-primary truncate px-1 text-center">
              {keyword}
            </span>
          )}
        </div>

        <div className="flex-1 p-3 min-w-0 flex flex-col">
          {/* 单词 - 点击播放 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="text-lg font-semibold text-primary hover:underline transition-all text-left w-full"
          >
            <span className="block truncate">{word.word}</span>
          </button>

          {/* 释义区域 - 显示1-3个词性的简短释义，同一词性合并一行 */}
          <div className="mt-1.5 flex-1 min-h-0">
            {groupedDefinitions.length > 0 ? (
              <div className="space-y-1 overflow-hidden">
                {groupedDefinitions.slice(0, 2).map(([pos, defs]) => (
                  <div key={pos} className="flex items-center gap-1.5">
                    <span className={`flex-shrink-0 px-1 py-0.5 text-xs font-medium rounded
                      ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {posToAbbr(pos)}
                    </span>
                    <p className={`text-sm truncate flex-1 min-w-0 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                      title={defs.map(d => {
                        const def = d.definition || '';
                        return def.length > 60 ? def : truncateDefinition(def, false);
                      }).join('；')}
                    >
                      {defs.map((def, idx) => truncateDefinition(def.definition || '', idx < defs.length - 1)).join('')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                暂无释义
              </p>
            )}
          </div>

          {/* 底部信息 - 日期 + 复制按钮 */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-1">
            <span className="truncate flex-shrink-0">{formatDate(word.createdAt)}</span>

            {/* 复制按钮 - 默认隐藏，hover显示 */}
            <button
              onClick={handleCopy}
              className={`p-1 rounded transition-all flex-shrink-0 opacity-0 group-hover:opacity-100
                ${copied
                  ? 'bg-green-500 text-white'
                  : theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-500 hover:text-gray-300'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              title={copied ? '已复制！' : '复制单词'}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 格式化日期（简化版）
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '今天';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

// 截断过长的释义（只显示第一个分号前的内容）
// addSemiColon: 是否在末尾加分号（最后一个释义不加）
function truncateDefinition(definition, addSemiColon = true) {
  if (!definition) return '暂无释义';

  // 去除首尾空格
  definition = definition.trim();

  // 如果释义包含分号，只显示第一部分
  const firstSemiColon = definition.indexOf('；');
  if (firstSemiColon > 0 && firstSemiColon < 80) {
    return definition.substring(0, firstSemiColon) + (addSemiColon ? '；' : '');
  }

  // 如果释义包含句号，只显示第一部分
  const firstPeriod = definition.indexOf('.');
  if (firstPeriod > 0 && firstPeriod < 80) {
    const result = definition.substring(0, firstPeriod + 1);
    return addSemiColon && !result.endsWith('；') ? result + '；' : result;
  }

  // 如果释义过长，智能截断到60字符
  if (definition.length > 60) {
    const truncated = definition.substring(0, 60);
    // 尝试在最后一个空格处截断，避免截断单词
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 40) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }

  return definition + (addSemiColon ? '；' : '');
}

// 词性中文转英文缩写
function posToAbbr(pos) {
  const mapping = {
    '名词': 'n.',
    '动词': 'v.',
    '形容词': 'adj.',
    '副词': 'adv.',
    '其他': 'other',
    '未知': 'unknown'
  };
  return mapping[pos] || pos;
}

// 截断例句（只显示前40个字符）
function truncateExample(example) {
  if (!example) return '';

  if (example.length > 40) {
    return example.substring(0, 40) + '...';
  }

  return example;
}

export default WordCard;
