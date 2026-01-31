import React, { useState } from 'react';
import { Copy, Check, Video, Hash, Twitter as TwitterIcon, Sparkles, ExternalLink } from 'lucide-react';
import { Platform } from '../types';

export interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface ContentCardProps {
  platform: Platform;
  title: string;
  children: React.ReactNode;
  accentColor: string;
  icon: React.ReactNode;
  onCopy: () => void;
  onPublish?: () => void; // 保留作为主发布按钮（兼容旧逻辑）
  extraActions?: ActionButton[]; // 新增：支持额外操作按钮
}

export const ContentCard: React.FC<ContentCardProps> = ({ 
  platform, 
  title, 
  children, 
  accentColor, 
  icon,
  onCopy,
  onPublish,
  extraActions
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-300 shadow-xl`}>
      {/* Header Accent */}
      <div className={`absolute top-0 left-0 w-full h-1 ${accentColor}`} />
      
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-slate-800 ${accentColor.replace('bg-', 'text-')}`}>
              {icon}
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {/* 额外按钮 (如视频号) */}
            {extraActions && extraActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors border border-slate-700"
                title={action.label}
              >
                {action.icon || <ExternalLink className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}

            {/* 主发布按钮 */}
            {onPublish && (
              <button
                onClick={onPublish}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors border border-slate-700"
                title="一键发布/去发布"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{platform === 'twitter' ? '发推' : (platform === 'tiktok' ? '去抖音' : '去发布')}</span>
              </button>
            )}
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>

        <div className="space-y-4 text-slate-300">
          {children}
        </div>
      </div>
      
      {/* Background glow effect */}
      <div className={`absolute -bottom-20 -right-20 w-40 h-40 ${accentColor} opacity-5 blur-[80px] rounded-full pointer-events-none`} />
    </div>
  );
};

export const PlatformIcon: React.FC<{ platform: Platform }> = ({ platform }) => {
  switch (platform) {
    case 'tiktok': return <Video className="w-5 h-5" />;
    case 'rednote': return <Hash className="w-5 h-5" />;
    case 'twitter': return <TwitterIcon className="w-5 h-5" />;
    case 'ai_video': return <Sparkles className="w-5 h-5" />;
  }
};