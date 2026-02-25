import React, { useEffect } from 'react';
import { X, Calendar, Sparkles, Bug, Zap, Image, Settings } from 'lucide-react';
import VERSION from '../config/version';

// 更新记录数据（按时间倒序，最新在前）
const CHANGELOG = [
  {
    date: '2026-02-25',
    version: 'v1.12.4',
    name: '图片永久保存',
    items: [
      { type: 'feature', icon: Image, text: 'AI 生成图片自动转 Base64 永久保存，避免 CDN 链接过期' },
      { type: 'feature', icon: Settings, text: '设置页新增「CDN 图片永久化」一键转换功能' },
      { type: 'feature', icon: Zap, text: '显示图片存储统计（CDN 数量 vs 永久保存数量）' },
    ]
  },
  {
    date: '2026-02-25',
    version: 'v1.12.3',
    name: '配图加载容错',
    items: [
      { type: 'fix', icon: Bug, text: '图片加载失败时显示关键词占位符，不再显示破损图片' },
      { type: 'improvement', icon: Image, text: '新增 WordImage 组件，统一处理图片加载状态' },
    ]
  },
  {
    date: '2026-02-13',
    version: 'v1.12.2',
    name: '音频与消消乐修复',
    items: [
      { type: 'fix', icon: Bug, text: '单词音频播放修复：整段播放放入 runAfterUnlock，Chrome 下恢复发音' },
      { type: 'fix', icon: Bug, text: '单词消消乐使用 Portal 挂载到 body，解决点击后空白页' },
      { type: 'improvement', icon: Zap, text: '消消乐按钮浅色主题 hover 样式修正' },
    ]
  },
  {
    date: '2026-02-13',
    version: 'v1.12.1',
    name: '闪卡自然拼读与体验',
    items: [
      { type: 'improvement', icon: Zap, text: '自然拼读：单词分段双色显示，第2遍按音节间隔播放' },
      { type: 'improvement', icon: Zap, text: '查看释义时点击空白即播单词；单词与例句字号加大' },
      { type: 'fix', icon: Bug, text: '选「生」后正确切到下一张' },
    ]
  },
  {
    date: '2026-02-13',
    version: 'v1.12.0',
    name: '闪卡与单词消消乐',
    items: [
      { type: 'feature', icon: Sparkles, text: '单词消消乐：一屏5词、一局15词，答对答错音效与连对鼓励' },
      { type: 'feature', icon: Zap, text: '闪卡默认显示图片，点击揭示单词/释义/例句' },
      { type: 'improvement', icon: Settings, text: '闪卡「生/熟悉」：生隔4张再出现，标记即时持久化' },
      { type: 'improvement', icon: Zap, text: '消消乐 5 词起开局；例句字号加大' },
    ]
  },
  {
    date: '2026-02-13',
    version: 'v1.11.1',
    name: '生图口令优化',
    items: [
      { type: 'improvement', icon: Image, text: '动词：人物+道具表现动作，不再用小企鹅' },
      { type: 'improvement', icon: Zap, text: '形容词/副词：人物或场景+辅助物品，更直观' },
    ]
  },
  {
    date: '2026-02-13',
    version: 'v1.11.0',
    name: '查词/生图/导出与保存逻辑优化',
    items: [
      { type: 'feature', icon: Sparkles, text: '服务端查词：Key 在 Vercel 配置一次，用户无需配置' },
      { type: 'feature', icon: Settings, text: '导出范围：全部 / 仅无图，方便导出无图单词' },
      { type: 'feature', icon: Image, text: '一键生图：列表页无图时显示，支持进度条' },
      { type: 'feature', icon: Image, text: '生图支持 MiniMax：配置 Key 后优先用 MiniMax image-01' },
      { type: 'improvement', icon: Zap, text: '按输入形式保存：输入 ran 即存 ran，不再自动转原形' },
      { type: 'improvement', icon: Zap, text: '导出恢复 TXT/CSV/MD 三格式，受导出范围控制' },
      { type: 'fix', icon: Bug, text: '查词超时与批量刷新并发优化' },
    ]
  },
  {
    date: '2026-02-09',
    version: 'v1.10.1',
    name: '数据稳定性修复',
    items: [
      { type: 'fix', icon: Bug, text: 'CSV导入词性显示"unknown"：重构定义导出格式，避免分号歧义' },
      { type: 'fix', icon: Bug, text: '刷新释义不再丢失配图：优先保留原有图片数据' },
      { type: 'fix', icon: Bug, text: '闪卡掌握度状态持久化：标记后立即写入本地存储' },
      { type: 'improvement', icon: Zap, text: 'CSV导出格式升级：结构化定义字段，兼容旧格式导入' },
    ]
  },
  {
    date: '2026-02-09',
    version: 'v1.10.0',
    name: '闪卡体验升级',
    items: [
      { type: 'feature', icon: Sparkles, text: 'Edge TTS自然语音：例句使用微软神经网络语音朗读' },
      { type: 'feature', icon: Sparkles, text: 'TXT单词批量导入：一行一个单词，自动查询释义' },
      { type: 'feature', icon: Sparkles, text: 'CSV单词导入：携带释义数据，无需API查询' },
      { type: 'feature', icon: Zap, text: 'Vercel部署上线：产品可通过公网访问' },
      { type: 'improvement', icon: Zap, text: '闪卡卡片加宽：长单词不再折行，配图文字比例优化' },
      { type: 'improvement', icon: Zap, text: '响应式字体适配：不同屏幕尺寸自动调整' },
      { type: 'improvement', icon: Settings, text: '语音回退机制：Edge TTS失败自动回退Web Speech API' },
    ]
  },
  {
    date: '2026-02-07',
    version: 'v1.9.2',
    name: '掌握度追踪',
    items: [
      { type: 'feature', icon: Sparkles, text: '掌握度记录：闪卡复习标记自动保存' },
      { type: 'feature', icon: Settings, text: '掌握度分类：未学、不认识、认识三种状态' },
      { type: 'feature', icon: Zap, text: '首页筛选：按掌握度快速筛选单词' },
      { type: 'feature', icon: Settings, text: '统计显示：每个分类显示单词数量' },
      { type: 'improvement', icon: Zap, text: '针对性复习：选择"不认识"进行闪卡复习' },
      { type: 'improvement', icon: Settings, text: '视觉反馈：不同状态使用不同颜色' },
    ]
  },
  {
    date: '2026-02-07',
    version: 'v1.9.1',
    name: '闪卡例句播放',
    items: [
      { type: 'feature', icon: Sparkles, text: '例句音频播放：点击例句即可播放发音' },
      { type: 'improvement', icon: Zap, text: '视觉反馈：播放时例句高亮显示' },
      { type: 'improvement', icon: Settings, text: '可点击样式：例句悬停时颜色变化' },
      { type: 'improvement', icon: Zap, text: '播放状态：正在播放的例句使用主题色高亮' },
    ]
  },
  {
    date: '2026-02-07',
    version: 'v1.9.0',
    name: '闪卡复习模式',
    items: [
      { type: 'feature', icon: Sparkles, text: '闪卡复习系统：看单词→思考→翻转答案' },
      { type: 'feature', icon: Zap, text: '自动打乱顺序：每次随机排列' },
      { type: 'feature', icon: Image, text: '双面卡片：正面单词，背面配图+释义' },
      { type: 'feature', icon: Zap, text: '快捷键：空格翻转，方向键切换' },
      { type: 'feature', icon: Settings, text: '实时统计：认识/不认识计数' },
      { type: 'feature', icon: Settings, text: '全屏沉浸：进度条+卡片翻转动画' },
      { type: 'feature', icon: Settings, text: '首页入口：闪卡复习模式卡片' },
    ]
  },
  {
    date: '2026-02-07',
    version: 'v1.8.0',
    name: '配图管理与样式优化',
    items: [
      { type: 'feature', icon: Image, text: '配图管理增强：悬停删除单个配图' },
      { type: 'feature', icon: Image, text: '只保留最新版：生成新配图时自动替换' },
      { type: 'feature', icon: Settings, text: '自动数据迁移：刷新自动清理多图单词' },
      { type: 'improvement', icon: Zap, text: '单词识别优化：scared→scare（不是scar）' },
      { type: 'improvement', icon: Zap, text: '完整单词保护：butter等40+单词不拆分' },
      { type: 'improvement', icon: Settings, text: '卡片样式重构：固定高度120-140px' },
      { type: 'improvement', icon: Settings, text: '智能文本截断：释义最多60字符' },
      { type: 'improvement', icon: Settings, text: '限制显示：最多2个词性（之前3个）' },
      { type: 'fix', icon: Bug, text: '修复重复单词问题' },
      { type: 'fix', icon: Bug, text: '修复删除图片后索引错误' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.7.0',
    name: '搜索增强与单词时态',
    items: [
      { type: 'feature', icon: Sparkles, text: '智能搜索：搜不到自动添加，已存在自动置顶' },
      { type: 'feature', icon: Sparkles, text: '单词时态识别系统（100+不规则动词）' },
      { type: 'feature', icon: Settings, text: '支持按输入形式保存（输入 ran 即存 ran）' },
      { type: 'feature', icon: Image, text: '详情页展示所有时态形式（过去式、分词等）' },
      { type: 'feature', icon: Zap, text: '时态形式可点击听发音' },
      { type: 'feature', icon: Settings, text: '搜索框和添加按钮移到中间位置' },
      { type: 'feature', icon: Settings, text: '底部版本号可点击查看更新记录' },
      { type: 'feature', icon: Zap, text: '音频加载状态反馈（播放中...）' },
      { type: 'feature', icon: Zap, text: '复制成功提示（已复制~）' },
      { type: 'feature', icon: Settings, text: '弹窗打开时锁定页面滚动' },
      { type: 'fix', icon: Bug, text: '修复例句音频不播放问题' },
      { type: 'fix', icon: Bug, text: '修复搜索后弹窗自动打开' },
      { type: 'fix', icon: Bug, text: '修复添加单词后弹窗重复' },
      { type: 'fix', icon: Bug, text: '修复模态框遮罩层问题' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.6.6',
    items: [
      { type: 'feature', icon: Settings, text: 'CSV 导出格式优化（一个单词一行）' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.6.5',
    items: [
      { type: 'fix', icon: Bug, text: '修复导出按钮无反应问题' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.6.4',
    items: [
      { type: 'feature', icon: Zap, text: '单个单词释义重新生成功能' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.6.3',
    items: [
      { type: 'fix', icon: Bug, text: '移除首页配图生成横幅' },
      { type: 'fix', icon: Bug, text: '修复释义截断问题（50→100字符）' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.6.2',
    items: [
      { type: 'fix', icon: Bug, text: '修复批量刷新时覆盖有效释义' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.6.1',
    items: [
      { type: 'feature', icon: Settings, text: 'API 限流错误智能重试机制' },
    ]
  },
  {
    date: '2026-02-05',
    version: 'v1.6.0',
    items: [
      { type: 'feature', icon: Image, text: '3D黏土配图风格' },
      { type: 'feature', icon: Zap, text: '后台换图功能' },
      { type: 'feature', icon: Settings, text: '首页显示1-3个词性释义' },
    ]
  },
  {
    date: '2026-02-05',
    version: 'v1.5.0',
    items: [
      { type: 'feature', icon: Image, text: '自动配图生成系统' },
      { type: 'feature', icon: Settings, text: '6种视觉风格（REAL、3D、INK等）' },
    ]
  },
  {
    date: '2026-02-05',
    version: 'v1.4.0',
    items: [
      { type: 'feature', icon: Sparkles, text: 'Obsidian 自动同步功能' },
    ]
  },
  {
    date: '2026-02-06',
    version: 'v1.5.0',
    items: [
      { type: 'feature', icon: Settings, text: '所有弹窗支持 ESC 键关闭' },
      { type: 'feature', icon: Sparkles, text: '点击例句中的单词可查看释义并添加到单词本' },
      { type: 'feature', icon: Settings, text: '优化设置页布局顺序，数据管理置顶' },
      { type: 'feature', icon: Settings, text: '移除主题设置，简化界面' },
      { type: 'feature', icon: Image, text: '添加更新记录页面，可查看所有历史优化' },
      { type: 'feature', icon: Zap, text: '优化添加单词弹窗样式，去除横线，压缩高度' },
      { type: 'feature', icon: Image, text: '支持多张配图轮播显示（卡片显示索引，详情页可切换）' },
      { type: 'feature', icon: Image, text: '配图导入支持 pear_1.png、pear_2.png 格式' },
      { type: 'fix', icon: Bug, text: '修复释义查询失败问题，添加本地词库和多API备份' },
    ]
  },
  {
    date: '2026-02-05',
    version: 'v1.4.0',
    items: [
      { type: 'feature', icon: Sparkles, text: '配图导入功能，按英文名自动匹配单词' },
      { type: 'feature', icon: Image, text: '图片自动压缩（600px, 75%质量）节省存储' },
      { type: 'feature', icon: Settings, text: '添加刷新释义功能，更新占位符数据' },
      { type: 'feature', icon: Zap, text: '导出格式新增 Obsidian MD' },
      { type: 'feature', icon: Settings, text: '弱化删除按钮，需要二次确认' },
    ]
  },
  {
    date: '2026-02-04',
    version: 'v1.3.0',
    items: [
      { type: 'feature', icon: Sparkles, text: '单词卡片显示关键词助记' },
      { type: 'feature', icon: Image, text: '支持配图显示（左侧缩略图区域）' },
      { type: 'feature', icon: Zap, text: '复制按钮移至卡片右下角，hover显示' },
      { type: 'feature', icon: Settings, text: '释义字号调大，例句翻译字号调小' },
      { type: 'fix', icon: Bug, text: '修复 SVG 自动生成相关错误' },
    ]
  },
  {
    date: '2026-02-03',
    version: 'v1.2.0',
    items: [
      { type: 'feature', icon: Sparkles, text: '添加音标显示功能' },
      { type: 'feature', icon: Zap, text: '自动查询释义（支持中英文）' },
      { type: 'feature', icon: Settings, text: '支持导出 TXT、CSV 格式' },
      { type: 'feature', icon: Image, text: '更新 Favicon 为书本图标' },
    ]
  },
  {
    date: '2026-02-02',
    version: 'v1.1.0',
    items: [
      { type: 'feature', icon: Sparkles, text: '添加语音朗读功能（Web Speech API）' },
      { type: 'feature', icon: Settings, text: '主题设置（浅色/深色/跟随系统）' },
      { type: 'feature', icon: Zap, text: '超大输入框，清晰易读' },
    ]
  },
  {
    date: '2026-02-01',
    version: 'v1.0.0',
    items: [
      { type: 'feature', icon: Sparkles, text: 'WordLog 首次发布 🎉' },
      { type: 'feature', icon: Settings, text: '基础单词收藏功能' },
      { type: 'feature', icon: Settings, text: '右键菜单快速添加单词' },
      { type: 'feature', icon: Settings, text: '本地存储数据' },
    ]
  },
];

function ChangelogModal({ onClose, theme }) {
  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 滚动锁定：弹窗打开时禁止页面滚动
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // 获取图标对应的样式
  const getIconStyle = (type) => {
    switch (type) {
      case 'feature':
        return 'text-green-500 bg-green-500/10';
      case 'fix':
        return 'text-orange-500 bg-orange-500/10';
      case 'improvement':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  // 获取类型标签
  const getTypeLabel = (type) => {
    switch (type) {
      case 'feature':
        return '新功能';
      case 'fix':
        return '修复';
      case 'improvement':
        return '优化';
      default:
        return '其他';
    }
  };

  // 按日期分组
  const groupedChangelog = CHANGELOG.reduce((groups, log) => {
    const date = log.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl rounded-lg shadow-xl custom-scrollbar overflow-y-auto max-h-[85vh]
          ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-5 border-b
          ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        `}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'}`}>
                <Calendar className={`w-5 h-5 ${theme === 'dark' ? 'text-primary-light' : 'text-primary'}`} />
              </div>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                更新记录
              </h2>
            </div>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              当前版本：{VERSION.fullVersion} · {VERSION.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors
              ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {Object.entries(groupedChangelog).map(([date, logs], groupIndex) => (
            <div key={date} className={`relative pb-4 ${groupIndex < Object.keys(groupedChangelog).length - 1 ? `border-l-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}` : ''}`}>
              {/* 日期标签 */}
              <div className="absolute -left-[9px] top-0 w-3 h-3 rounded-full bg-primary border-2"></div>

              <div className="pl-3">
                {/* 日期 */}
                <div className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {date}
                </div>

                {/* 该日期的所有版本 */}
                <div className="space-y-2">
                  {logs.map((log, logIndex) => (
                    <div key={log.version} className={`px-2.5 py-2 rounded ${theme === 'dark' ? 'bg-gray-900/30' : 'bg-gray-50'}`}>
                      {/* 版本号 */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${theme === 'dark' ? 'bg-primary text-white' : 'bg-primary text-white'}`}>
                          {log.version}
                        </span>
                        {log.name && (
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {log.name}
                          </span>
                        )}
                      </div>

                      {/* 更新项列表 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {log.items.map((item, itemIndex) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={itemIndex}
                              className={`flex items-start gap-1.5 px-2 py-1 rounded transition-colors text-xs
                                ${theme === 'dark' ? 'hover:bg-gray-900/50' : 'hover:bg-white'}
                              `}
                            >
                              <div className={`p-0.5 rounded ${getIconStyle(item.type)} flex-shrink-0 mt-0.5`}>
                                <Icon className="w-3 h-3" />
                              </div>
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} style={{ lineHeight: '1.4' }}>
                                {item.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部 */}
        <div className={`px-4 py-3 border-t text-center ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            持续优化中，感谢使用 WordLog 📚
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChangelogModal;
