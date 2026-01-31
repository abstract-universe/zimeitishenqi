import React, { useState, useEffect } from 'react';
import { generateSocialContent, fetchRealtimeTrends, TrendItem } from './services/geminiService';
import { GeneratedContent } from './types';
import { ContentCard, PlatformIcon, ActionButton } from './components/ContentCard';
import { Sparkles, Loader2, SendHorizontal, Zap, Flame, PenTool, Crown, Lock, CheckCircle2, X, CreditCard, Wallet, Globe, Tv, TrendingUp, ArrowRight, Tag, RefreshCw, Search, Signal, SignalLow, Rocket } from 'lucide-react';

// --- 🔧 配置区域 (请在此处修改您的收款码链接) ---
// 1. 请将您的微信收款码图片上传到网络（如图床），或者是项目内的路径，填入下方引号内。
const WECHAT_QR_IMAGE = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=这里换成您的微信收款码图片地址";

// 2. 请将您的PayPal收款码图片填入下方。
// 如果您想使用 PayPal.me 链接生成二维码，可以使用: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://paypal.me/您的用户名"
const PAYPAL_QR_IMAGE = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=这里换成您的PayPal收款码图片地址";
// ------------------------------------------------

// 配置常量
const DAILY_LIMIT = 3; // 免费用户每日限制次数
const PRICE = "9.9";

type PaymentMethod = 'wechat' | 'paypal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'imitate' | 'trending'>('create');
  const [theme, setTheme] = useState('');
  const [referenceContent, setReferenceContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 会员与限额状态
  const [isPremium, setIsPremium] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // 支付方式状态
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');

  // 热门趋势状态 (真实数据)
  const [visibleTrends, setVisibleTrends] = useState<TrendItem[]>([]);
  const [isRefreshingTrends, setIsRefreshingTrends] = useState(false);
  const [hasFetchedInitialTrends, setHasFetchedInitialTrends] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false); // 新增：是否在使用兜底数据

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  // 当切换到热门趋势 Tab 且没有数据时，自动获取
  useEffect(() => {
    if (activeTab === 'trending' && !hasFetchedInitialTrends && visibleTrends.length === 0) {
      handleRefreshTrends();
      setHasFetchedInitialTrends(true);
    }
  }, [activeTab]);

  const checkSubscriptionStatus = () => {
    const storedPremium = localStorage.getItem('viral_content_is_premium');
    
    // 1. 检查会员状态
    if (storedPremium === 'true') {
      setIsPremium(true);
      return;
    }

    // 2. 检查今日用量
    const today = new Date().toDateString();
    const lastUsageDate = localStorage.getItem('viral_content_last_usage_date');
    const usage = parseInt(localStorage.getItem('viral_content_daily_usage') || '0');

    if (lastUsageDate !== today) {
      // 新的一天，重置
      localStorage.setItem('viral_content_last_usage_date', today);
      localStorage.setItem('viral_content_daily_usage', '0');
      setDailyUsage(0);
    } else {
      setDailyUsage(usage);
    }
  };

  const incrementUsage = () => {
    if (isPremium) return;
    const newUsage = dailyUsage + 1;
    setDailyUsage(newUsage);
    localStorage.setItem('viral_content_daily_usage', newUsage.toString());
  };

  const handlePaymentSuccess = () => {
    localStorage.setItem('viral_content_is_premium', 'true');
    setIsPremium(true);
    setShowPaywall(false);
    setShowPaymentModal(false);
    alert('感谢您的支持！尊贵会员权益已解锁。');
  };

  const handleUseTemplate = (content: string, title: string) => {
    setReferenceContent(content);
    setTheme(title);
    setActiveTab('imitate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 获取真实热门趋势
  const handleRefreshTrends = async () => {
    setIsRefreshingTrends(true);
    try {
      // 调用 Gemini 服务获取实时数据
      const trends = await fetchRealtimeTrends();
      setVisibleTrends(trends);
      
      // 检测是否为兜底数据
      if (trends.length > 0 && trends[0].isFallback) {
        setIsUsingFallback(true);
      } else {
        setIsUsingFallback(false);
      }
    } catch (e) {
      console.error("Failed to fetch trends");
      // 注意：fetchRealtimeTrends 内部已经有 catch 并返回 fallback 了
      // 这里再次防守
      setIsUsingFallback(true);
    } finally {
      setIsRefreshingTrends(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // 权限检查
    if (!isPremium && dailyUsage >= DAILY_LIMIT) {
      setShowPaywall(true);
      return;
    }

    if (!theme.trim()) return;
    if (activeTab === 'imitate' && !referenceContent.trim()) {
      setError("请先输入或选择需要仿写的参考文案");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await generateSocialContent(theme, activeTab === 'imitate' ? referenceContent : undefined);
      setData(result);
      incrementUsage();
    } catch (err) {
      setError("生成内容失败。温馨提示：由于使用 Google AI 模型，国内网络环境可能需要使用加速器才能正常生成。");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- 发布功能逻辑 ---
  const handlePublishTikTok = (t: GeneratedContent['tiktok']) => {
    const fullText = `${t.title}\n\n${t.script_0_3s}\n${t.script_3_15s}\n${t.script_15_45s}\n${t.script_ending}`;
    copyToClipboard(fullText);
    alert("脚本已复制！正在前往抖音网页版上传页面...");
    window.open('https://www.douyin.com/creator-center/content/upload', '_blank');
  };

  const handlePublishWeChatChannels = (t: GeneratedContent['tiktok']) => {
    const fullText = `${t.title}\n\n${t.script_0_3s}\n${t.script_3_15s}\n${t.script_15_45s}\n${t.script_ending}`;
    copyToClipboard(fullText);
    alert("脚本已复制！正在前往视频号助手...");
    window.open('https://channels.weixin.qq.com/platform', '_blank');
  };

  const handlePublishRedNote = (r: GeneratedContent['rednote']) => {
    const fullText = `${r.title}\n\n${r.content}\n\n${r.tags.map(tag => `#${tag}`).join(' ')}`;
    copyToClipboard(fullText);
    alert("文案已复制！正在前往小红书网页版...");
    window.open('https://www.xiaohongshu.com/explore', '_blank');
  };

  const handlePublishTwitter = (tw: GeneratedContent['twitter']) => {
    const fullText = `${tw.hook}\n👇\n${tw.points.map((p, i) => `${i + 1}️⃣ ${p}`).join('\n')}\n💡 ${tw.summary}`;
    const encodedText = encodeURIComponent(fullText);
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
  };

  // Helper formats for pure clipboard copy
  const formatTikTokForClipboard = (t: GeneratedContent['tiktok']) => {
    return `【抖音/视频号脚本】\n标题：${t.title}\n画面建议：${t.visual_suggestions}\n\n(0-3秒)：${t.script_0_3s}\n(3-15秒)：${t.script_3_15s}\n(15-45秒)：${t.script_15_45s}\n(结尾)：${t.script_ending}`;
  };
  const formatRedNoteForClipboard = (r: GeneratedContent['rednote']) => {
    return `${r.title}\n\n${r.content}\n\n${r.tags.map(t => `#${t}`).join(' ')}`;
  };
  const formatTwitterForClipboard = (tw: GeneratedContent['twitter']) => {
    return `${tw.hook}\n👇\n${tw.points.map((p, i) => `${i + 1}️⃣ ${p}`).join('\n')}\n💡 ${tw.summary}`;
  };

  // 支付模态框组件
  const PaymentModal = ({ onClose, forced }: { onClose: () => void, forced?: boolean }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 blur-[50px] rounded-full"></div>

        {!forced && (
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="text-center mb-6 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {forced ? "今日免费额度已用完" : "升级尊贵会员"}
          </h2>
          <p className="text-slate-400 text-sm">
            {forced ? "免费版每日限生成 3 次。升级会员解锁无限创作特权！" : "一次付费，永久解锁无限生成权限。"}
          </p>
        </div>

        {/* 权益对比小卡片 */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-xs relative z-10">
           <div className="bg-slate-800/50 p-2 rounded-lg text-center border border-slate-700 opacity-60">
             <div className="font-bold text-slate-300 mb-1">免费版</div>
             <div className="text-slate-500">每日 3 次生成</div>
             <div className="text-slate-500">基础功能</div>
           </div>
           <div className="bg-gradient-to-br from-indigo-900/40 to-fuchsia-900/40 p-2 rounded-lg text-center border border-indigo-500/30">
             <div className="font-bold text-white mb-1">尊贵会员</div>
             <div className="text-indigo-200">无限次生成</div>
             <div className="text-indigo-200">优先响应</div>
           </div>
        </div>

        {/* 支付方式选择 */}
        <div className="flex justify-center gap-4 mb-6 relative z-10">
          <button 
            onClick={() => setPaymentMethod('wechat')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${paymentMethod === 'wechat' ? 'text-green-400 bg-green-400/10 ring-1 ring-green-400/50' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="font-bold">微信</span>
            </div>
            <span className="text-xs">WeChat</span>
          </button>
          
          <button 
            onClick={() => setPaymentMethod('paypal')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${paymentMethod === 'paypal' ? 'text-sky-400 bg-sky-400/10 ring-1 ring-sky-400/50' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
               <span className="font-bold">P</span>
            </div>
            <span className="text-xs">PayPal</span>
          </button>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-6 mb-6 text-center border border-slate-700 relative z-10">
          <div className="flex items-end justify-center gap-2 mb-4">
            <span className="text-4xl font-bold text-white">¥{PRICE}</span>
            <span className="text-slate-500 line-through mb-1">¥99</span>
          </div>
          
          {/* 动态展示支付内容 */}
          <div className="w-48 h-48 bg-white mx-auto rounded-lg p-2 mb-4 flex items-center justify-center overflow-hidden bg-slate-900/50 border border-slate-700/50">
             {paymentMethod === 'wechat' && (
               <img 
                 src={WECHAT_QR_IMAGE}
                 alt="微信支付" 
                 className="w-full h-full object-contain"
               />
             )}
             {paymentMethod === 'paypal' && (
               <img 
                 src={PAYPAL_QR_IMAGE} 
                 alt="PayPal Payment" 
                 className="w-full h-full object-contain"
               />
             )}
          </div>
          <p className="text-xs text-slate-500">
            {paymentMethod === 'wechat' && "请使用微信扫码支付"}
            {paymentMethod === 'paypal' && "请使用 PayPal 扫码支付"}
          </p>
        </div>

        <button
          onClick={handlePaymentSuccess}
          className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2 relative z-10"
        >
          <CheckCircle2 className="w-5 h-5" />
          我已完成支付
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      
      {/* 支付墙/模态框 */}
      {(showPaywall || showPaymentModal) && (
        <PaymentModal 
          onClose={() => setShowPaymentModal(false)} 
          forced={showPaywall} 
        />
      )}

      {/* 顶部状态栏 */}
      <div className="w-full bg-slate-900/50 border-b border-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">灵感哨兵</span>
          </div>
          <div className="flex items-center gap-4">
            {isPremium ? (
              <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                <Crown className="w-3.5 h-3.5" />
                <span className="font-medium">尊贵会员</span>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="flex gap-0.5">
                    {[...Array(DAILY_LIMIT)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-4 rounded-full ${i < dailyUsage ? 'bg-slate-700' : 'bg-indigo-500'}`}
                        title={i < dailyUsage ? '已使用' : '剩余额度'}
                      />
                    ))}
                  </div>
                  <span className="hidden sm:inline">今日剩余: <span className="text-white font-bold">{Math.max(0, DAILY_LIMIT - dailyUsage)}</span> 次</span>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  解锁无限
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            <span>AI 驱动的爆款内容引擎</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            几秒钟生成 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">爆款内容</span>
          </h1>
          <p className="text-lg text-slate-400">
            {activeTab === 'create' 
              ? "输入一个主题，让 AI 为您生成抖音、小红书、推特和视频提示词的定制脚本。" 
              : activeTab === 'imitate' 
                ? "粘贴热门文案或选择模板，AI 将分析其爆款逻辑并应用于您的新主题。"
                : "发现当下的流量密码，一键应用热门模板进行仿写。"}
          </p>
        </div>

        {/* Input Section Container */}
        <div className="max-w-4xl mx-auto mb-16">
          
          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 inline-flex flex-wrap gap-1 justify-center sm:justify-start">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'create' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                主题生成
              </button>
              <button
                onClick={() => setActiveTab('imitate')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'imitate' 
                    ? 'bg-fuchsia-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Flame className="w-4 h-4" />
                爆款仿写
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'trending' 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                热门趋势
              </button>
            </div>
          </div>

          {/* TRENDING TAB CONTENT */}
          {activeTab === 'trending' && (
            <div className="animate-fade-in-up">
              {/* Magic Internet Hint Banner */}
              {isUsingFallback && (
                <div className="mb-6 mx-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4 animate-fade-in shadow-lg shadow-amber-900/10">
                  <div className="p-2.5 bg-amber-500/20 rounded-full shrink-0 border border-amber-500/30">
                     <Rocket className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 text-sm text-amber-200/90 leading-relaxed">
                     <p className="font-bold text-amber-400 mb-0.5 text-base">💡 解锁更强大的实时算力</p>
                     <p>当前网络连接受限，仅展示离线精选模版。建议开启 <span className="text-white font-bold decoration-amber-500 underline decoration-wavy underline-offset-4">魔法上网 (VPN)</span> 后刷新，AI 将为您实时挖掘全网最新热点！</p>
                  </div>
                </div>
              )}

              {/* Header with Refresh Button */}
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <div className="space-y-1">
                   <div className="flex items-center gap-2 text-slate-300">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      <span className="font-bold text-lg">
                        {isUsingFallback ? "精选热门模板库" : "AI 实时全网热榜"}
                      </span>
                   </div>
                   <p className="text-xs text-slate-500 flex items-center gap-1">
                     {isUsingFallback ? (
                        <>
                           <SignalLow className="w-3 h-3 text-amber-500" />
                           <span className="text-amber-500/80">网络连接受限，已切换至离线模板</span>
                        </>
                     ) : (
                        <>
                           <Signal className="w-3 h-3 text-emerald-500" />
                           <span className="text-emerald-500/80">实时数据 · 谷歌搜索驱动</span>
                        </>
                     )}
                   </p>
                 </div>
                 <button 
                   onClick={handleRefreshTrends}
                   disabled={isRefreshingTrends}
                   className="flex items-center gap-2 text-sm text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-full transition-all border border-slate-700 hover:border-slate-600 w-full sm:w-auto justify-center"
                 >
                   <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTrends ? 'animate-spin' : ''}`} />
                   <span>{isRefreshingTrends ? '正在获取...' : '刷新内容'}</span>
                 </button>
               </div>

               {isRefreshingTrends && visibleTrends.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <p className="animate-pulse">正在尝试连接全网热点...</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleTrends.map((item, index) => (
                      <div key={`${index}`} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-orange-500/50 hover:bg-slate-800/50 transition-all group flex flex-col h-full animate-fade-in">
                         <div className="flex justify-between items-start mb-3">
                            <span className="px-2 py-1 rounded bg-slate-800 text-xs text-orange-400 border border-orange-500/20 font-medium">
                              {item.category}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-red-400 font-bold bg-red-950/30 px-2 py-0.5 rounded-full">
                               <Flame className="w-3 h-3 fill-red-500" />
                               {item.heat}
                            </div>
                         </div>
                         <h3 className="text-lg font-bold text-slate-100 mb-2">{item.title}</h3>
                         <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-grow italic">
                           "{item.content}"
                         </p>
                         <div className="flex flex-wrap gap-2 mb-4">
                            {item.tags.map(tag => (
                               <span key={tag} className="flex items-center text-[10px] text-slate-500">
                                 <Tag className="w-3 h-3 mr-0.5" /> {tag}
                               </span>
                            ))}
                         </div>
                         <button 
                           onClick={() => handleUseTemplate(item.content, item.title)}
                           className="w-full mt-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-orange-600 hover:text-white text-slate-300 py-2 rounded-lg text-sm font-medium transition-all group-hover:shadow-lg"
                         >
                           使用此模版 <ArrowRight className="w-4 h-4" />
                         </button>
                      </div>
                    ))}
                    {visibleTrends.length === 0 && !isRefreshingTrends && (
                       <div className="col-span-full text-center py-10 text-slate-500">
                          暂无数据，请点击右上角刷新获取。
                       </div>
                    )}
                 </div>
               )}
            </div>
          )}

          {/* CREATE & IMITATE TABS CONTENT */}
          {(activeTab === 'create' || activeTab === 'imitate') && (
            <form onSubmit={handleGenerate} className="relative group space-y-6">
            
              {/* Imitation Mode - Reference Input Area */}
              {activeTab === 'imitate' && (
                <div className="animate-fade-in-down space-y-4">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-xl blur opacity-10"></div>
                    <textarea
                      value={referenceContent}
                      onChange={(e) => setReferenceContent(e.target.value)}
                      placeholder="在此粘贴你想要模仿的爆款文案风格，或者去“热门趋势”选择..."
                      className="relative w-full h-32 bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 resize-none text-sm leading-relaxed custom-scrollbar"
                    />
                  </div>
                </div>
              )}

              {/* Main Topic Input */}
              <div className="relative">
                <div className={`absolute -inset-1 bg-gradient-to-r ${activeTab === 'create' ? 'from-indigo-500 to-fuchsia-500' : 'from-fuchsia-500 to-orange-500'} rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200`}></div>
                <div className="relative flex items-center bg-slate-900 rounded-xl p-2 border border-slate-800 shadow-2xl">
                  {/* 锁定状态遮罩 */}
                  {!isPremium && dailyUsage >= DAILY_LIMIT && (
                    <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center cursor-not-allowed">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Lock className="w-5 h-5" />
                          <span>今日免费额度已用完</span>
                        </div>
                    </div>
                  )}
                  
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder={activeTab === 'create' ? "例如：远程工作的未来，如何制作完美的咖啡..." : "输入你的新内容主题，例如：学习英语"}
                    className="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-3 focus:outline-none text-lg"
                    disabled={loading || (!isPremium && dailyUsage >= DAILY_LIMIT)}
                  />
                  <button
                    type="submit"
                    disabled={loading || !theme.trim() || (activeTab === 'imitate' && !referenceContent.trim()) || (!isPremium && dailyUsage >= DAILY_LIMIT)}
                    className={`disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 min-w-[140px] justify-center ${
                      activeTab === 'create' 
                        ? 'bg-indigo-600 hover:bg-indigo-500' 
                        : 'bg-fuchsia-600 hover:bg-fuchsia-500'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{activeTab === 'create' ? '思考中...' : '分析仿写中...'}</span>
                      </>
                    ) : (
                      <>
                        {activeTab === 'create' ? <Sparkles className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
                        <span>{activeTab === 'create' ? '生成内容' : '立即仿写'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Results Grid */}
        {data && (activeTab === 'create' || activeTab === 'imitate') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            
            {/* TikTok Card */}
            <ContentCard
              platform="tiktok"
              title="抖音 / 视频号脚本"
              accentColor="bg-fuchsia-500"
              icon={<PlatformIcon platform="tiktok" />}
              onCopy={() => copyToClipboard(formatTikTokForClipboard(data.tiktok))}
              onPublish={() => handlePublishTikTok(data.tiktok)}
              extraActions={[
                { label: '去视频号', onClick: () => handlePublishWeChatChannels(data.tiktok), icon: <Tv className="w-3.5 h-3.5" /> }
              ]}
            >
              <div className="space-y-4">
                <div className="border-l-2 border-fuchsia-500/30 pl-4 py-1">
                  <span className="text-xs text-fuchsia-400 font-bold uppercase tracking-wider block mb-1">标题</span>
                  <p className="font-semibold text-white">{data.tiktok.title}</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">画面建议</span>
                  <p className="text-sm text-slate-400 italic">{data.tiktok.visual_suggestions}</p>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <div className="grid grid-cols-[60px_1fr] gap-3">
                    <span className="text-fuchsia-400/70 text-right">0-3秒</span>
                    <p>{data.tiktok.script_0_3s}</p>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] gap-3">
                    <span className="text-fuchsia-400/70 text-right">3-15秒</span>
                    <p>{data.tiktok.script_3_15s}</p>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] gap-3">
                    <span className="text-fuchsia-400/70 text-right">15-45秒</span>
                    <p>{data.tiktok.script_15_45s}</p>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] gap-3">
                    <span className="text-fuchsia-400/70 text-right">结尾</span>
                    <p className="text-fuchsia-300 font-medium">{data.tiktok.script_ending}</p>
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* RedNote Card */}
            <ContentCard
              platform="rednote"
              title="小红书 / 种草文案"
              accentColor="bg-red-500"
              icon={<PlatformIcon platform="rednote" />}
              onCopy={() => copyToClipboard(formatRedNoteForClipboard(data.rednote))}
              onPublish={() => handlePublishRedNote(data.rednote)}
            >
              <div className="space-y-4">
                 <div className="border-l-2 border-red-500/30 pl-4 py-1">
                  <span className="text-xs text-red-400 font-bold uppercase tracking-wider block mb-1">标题</span>
                  <p className="font-semibold text-white">{data.rednote.title}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-200">
                  {data.rednote.content}
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.rednote.tags.map((tag, i) => (
                    <span key={i} className="text-red-400 text-sm bg-red-500/10 px-2 py-1 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </ContentCard>

            {/* Twitter Card */}
            <ContentCard
              platform="twitter"
              title="推特 / X 深度推文"
              accentColor="bg-sky-500"
              icon={<PlatformIcon platform="twitter" />}
              onCopy={() => copyToClipboard(formatTwitterForClipboard(data.twitter))}
              onPublish={() => handlePublishTwitter(data.twitter)}
            >
               <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
                      <span className="font-bold text-sky-500">AI</span>
                    </div>
                    <div className="space-y-3 w-full">
                      <p className="font-medium text-white text-[15px]">{data.twitter.hook}</p>
                      <div className="pl-4 border-l-2 border-slate-800 space-y-3">
                        {data.twitter.points.map((point, idx) => (
                          <p key={idx} className="text-slate-300 text-sm">{idx + 1}️⃣ {point}</p>
                        ))}
                      </div>
                      <div className="bg-sky-500/5 rounded-lg p-3 border border-sky-500/10">
                        <p className="text-sm text-sky-200"><span className="mr-2">💡</span>{data.twitter.summary}</p>
                      </div>
                    </div>
                  </div>
                </div>
               </div>
            </ContentCard>

            {/* AI Video Prompt Card - No publish button for prompts */}
            <ContentCard
              platform="ai_video"
              title="AI 视频提示词 (中文)"
              accentColor="bg-emerald-500"
              icon={<PlatformIcon platform="ai_video" />}
              onCopy={() => copyToClipboard(data.ai_video.image_prompt)}
            >
              <div className="h-full flex flex-col">
                <div className="flex-1 bg-black/40 rounded-lg p-4 font-mono text-sm text-emerald-100/80 border border-emerald-500/20 leading-relaxed">
                  {data.ai_video.image_prompt}
                </div>
                <div className="mt-4 flex gap-2">
                   <div className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">Runway</div>
                   <div className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">Midjourney</div>
                   <div className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">Sora</div>
                </div>
              </div>
            </ContentCard>
          </div>
        )}
        
        {!data && !loading && activeTab !== 'trending' && (
          <div className="text-center mt-20 text-slate-600">
            <SendHorizontal className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>准备就绪。请在上方输入主题。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;