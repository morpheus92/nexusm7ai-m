import { useState, useRef, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Download, 
  CheckCircle2,
  ArrowLeft,
  Lightbulb, // For intelligent interpretation
  MessageSquare, // For text generation
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Corrected import path for useToast
import { useNavigate, Link } from "react-router-dom"; // Import Link
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Import Switch component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip
// import { Slider } from "@/components/ui/slider"; // Slider is no longer needed

// MikuToolsEmbed component is removed as per user request

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  color: string;
  provider: 'pollinations'; // Only Pollinations.ai now
  chineseName: string; // Chinese name for display
  avatar: string; // Emoji or simple icon for avatar
}

interface HistoryItem {
  id: number;
  timestamp: Date;
  voice: string;
  text: string;
  audioUrl?: string;
  isInterpretation?: boolean;
}

const Voice = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, checkPaymentStatus } = useAuth();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isInterpretationMode, setIsInterpretationMode] = useState(false);
  const [isRawTextMode, setIsRawTextMode] = useState(true);
  // Removed activeVoiceTab state as there's only one tab now
  const audioRef = useRef<HTMLAudioElement>(null);

  // Voice options - only Pollinations.ai voices remain
  const voiceOptions: VoiceOption[] = [
    { id: 'alloy', name: 'Alloy', description: 'Balanced', color: '#8B5CF6', provider: 'pollinations', chineseName: '合金', avatar: '🤖' },
    { id: 'echo', name: 'Echo', description: 'Deep', color: '#6366F1', provider: 'pollinations', chineseName: '回声', avatar: '🗣️' },
    { id: 'fable', name: 'Fable', description: 'Warm', color: '#8B5CF6', provider: 'pollinations', chineseName: '寓言', avatar: '📖' },
    { id: 'onyx', name: 'Onyx', description: 'Authoritative', color: '#333333', provider: 'pollinations', chineseName: '玛瑙', avatar: '👑' },
    { id: 'nova', name: 'Nova', description: 'Friendly', color: '#10B981', provider: 'pollinations', chineseName: '新星', avatar: '✨' },
    { id: 'shimmer', name: 'Shimmer', description: 'Bright', color: '#60A5FA', provider: 'pollinations', chineseName: '微光', avatar: '🌟' },
    { id: 'coral', name: 'Coral', description: 'Gentle & Calm', color: '#F87171', provider: 'pollinations', chineseName: '珊瑚', avatar: '🌸' },
    { id: 'verse', name: 'Verse', description: 'Poetic', color: '#FBBF24', provider: 'pollinations', chineseName: '诗歌', avatar: '📜' },
    { id: 'ballad', name: 'Ballad', description: 'Lyrical', color: '#A78BFA', provider: 'pollinations', chineseName: '歌谣', avatar: '🎶' },
    { id: 'ash', name: 'Ash', description: 'Thoughtful', color: '#4B5563', provider: 'pollinations', chineseName: '灰烬', avatar: '🤔' },
    { id: 'sage', name: 'Sage', description: 'Wise', color: '#059669', provider: 'pollinations', chineseName: '智者', avatar: '🦉' },
    { id: 'brook', name: 'Brook', description: 'Smooth', color: '#3B82F6', provider: 'pollinations', chineseName: '小溪', avatar: '🌊' },
    { id: 'clover', name: 'Clover', description: 'Lively', color: '#EC4899', provider: 'pollinations', chineseName: '三叶草', avatar: '🍀' },
    { id: 'dan', name: 'Dan', description: 'Steady Male', color: '#1F2937', provider: 'pollinations', chineseName: '丹', avatar: '👨' },
    { id: 'elan', name: 'Elan', description: 'Elegant', color: '#7C3AED', provider: 'pollinations', chineseName: '活力', avatar: '💃' },
    { id: 'amuch', name: 'Amuch', description: 'Unique Tone', color: '#FF5733', provider: 'pollinations', chineseName: '阿穆奇', avatar: '🎤' },
    { id: 'aster', name: 'Aster', description: 'Fresh & Natural', color: '#33FF57', provider: 'pollinations', chineseName: '紫菀', avatar: '🌼' },
    { id: 'marilyn', name: 'Marilyn', description: 'Classic Female', color: '#FF33A1', provider: 'pollinations', chineseName: '玛丽莲', avatar: '👩' },
    { id: 'meadow', name: 'Meadow', description: 'Calm & Soft', color: '#33A1FF', provider: 'pollinations', chineseName: '草地', avatar: '🌿' },
  ];

  // Pollinations voices are now the only ones in voiceOptions
  const pollinationsVoices = voiceOptions;

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('nexusAiVoiceHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (e) {
        console.error('Failed to parse voice history', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('nexusAiVoiceHistory', JSON.stringify(history));
  }, [history]);

  // Effect to play audio when audioUrl changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load(); // Ensure the new source is loaded
      audioRef.current.play().catch(e => console.error("Audio play failed:", e)); // Attempt to play, catch potential errors
    }
  }, [audioUrl]);

  const handleGenerateVoice = async () => {
    // Membership check for Pollinations.ai voices
    if (!isAuthenticated) {
      toast({
        title: "需要登录",
        description: "请先登录后再使用语音合成功能",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    if (!checkPaymentStatus()) { // Use checkPaymentStatus from AuthContext
      toast({
        title: "会员功能",
        description: "语音合成是会员专享功能，请先升级为会员",
        variant: "destructive",
      });
      navigate('/payment');
      return;
    }

    if (!text.trim()) {
      toast({
        title: "内容为空",
        description: "请输入需要转换为语音的文本",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setAudioUrl(null); // Clear previous audio

    try {
      let finalTextToSpeak = text.trim();
      let isInterpretation = false;

      // Logic for "纯文本朗读模式" and "智能演绎模式"
      if (!isRawTextMode) { // If pure raw text mode is OFF, then interpretation mode can be ON
        if (isInterpretationMode) {
          isInterpretation = true;
          // 1. Call text generation AI for interpretation
          // Updated prompt for "主播式" and non-conversational style
          const interpretationPrompt = `请以主播的口吻，根据以下主题进行非对话式的阐述和讨论，内容要丰富且有深度，不要以对话形式开始或结束，直接给出内容：${text}`;
          const encodedInterpretationPrompt = encodeURIComponent(interpretationPrompt);
          const textGenApiUrl = `https://text.pollinations.ai/${encodedInterpretationPrompt}?model=openai-large`; // Using openai-large for interpretation

          toast({
            title: "智能演绎中",
            description: "AI正在思考并生成内容...",
            duration: 2000
          });

          const textResponse = await fetch(textGenApiUrl);
          if (!textResponse.ok) {
            const errorText = await textResponse.text();
            console.error('Text generation API raw error:', textResponse.status, errorText);
            if (textResponse.status === 402) {
              throw new Error("402 Payment Required: 文本生成API额度不足或需要付费。请检查您的API密钥或账户余额。");
            }
            throw new Error(`文本生成API响应错误: ${textResponse.status} - ${errorText.substring(0, 100)}...`);
          }
          finalTextToSpeak = await textResponse.text(); // Assuming it returns plain text
          
          if (!finalTextToSpeak.trim()) {
              throw new Error("AI未能生成有效内容，请尝试其他主题。");
          }
        }
      } else { // If isRawTextMode is true, ensure strict reading for Pollinations.ai
        const selectedVoiceOption = voiceOptions.find(voice => voice.id === selectedVoice);
        if (selectedVoiceOption?.provider === 'pollinations') {
          // Prepend a strict instruction for pure text reading
          finalTextToSpeak = `请严格按照以下文本内容进行朗读，不要添加任何评论、对话或额外内容："${finalTextToSpeak}"`;
        }
      }

      const selectedVoiceOption = voiceOptions.find(voice => voice.id === selectedVoice);
      if (!selectedVoiceOption) {
        throw new Error("未找到选定的语音模型。");
      }

      let audioApiUrl = '';

      if (selectedVoiceOption.provider === 'pollinations') {
        audioApiUrl = `https://text.pollinations.ai/${encodeURIComponent(finalTextToSpeak)}?model=openai-audio&voice=${selectedVoiceOption.id}&nologo=true`;
      }
      else {
        throw new Error("不支持的语音提供商。");
      }
      
      // Simulate network delay for better UX if API is too fast
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAudioUrl(audioApiUrl);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        timestamp: new Date(),
        voice: selectedVoice,
        text: finalTextToSpeak, // Save the actual text spoken
        audioUrl: audioApiUrl,
        isInterpretation: isInterpretation,
      };
      
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]); // Keep latest 10
      
      toast({
        title: "语音生成成功",
        description: "您的文本已成功转换为语音",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error generating audio:', error);
      let errorMessage = "语音生成过程中发生错误，请稍后再试。";
      if (error.message.includes("402 Payment Required")) {
        errorMessage = "API额度不足或需要付费。请检查您的API密钥或账户余额。";
      } else if (error.message.includes("非JSON响应")) {
        errorMessage = `API返回了非预期的响应格式（可能是一个错误页面或API问题）。详细: ${error.message}`;
      } else {
        errorMessage = error.message;
      }

      toast({
        title: "生成失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearHistory = () => {
    if (window.confirm("确定要清空所有语音历史记录吗？此操作不可撤销。")) {
      setHistory([]);
      localStorage.removeItem('nexusAiVoiceHistory');
      toast({
        title: "历史记录已清空",
        description: "所有语音生成历史记录已删除",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#1a1f2e] to-[#0f1419]">
      <Navigation />
      
      <main className="pt-24 px-6">
        <div className="max-w-7xl mx-auto">
          {/* 标题区域 - 更宽敞 */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              AI 文本转音频
            </h1>
            <p className="text-gray-300 mb-8 text-lg">
              输入文字，选择语音风格，一键转换为自然流畅的语音。<br />
              支持多种音色音调，帮您创建专业水准的音频内容。
            </p>
            <Link to="/" className="inline-flex items-center text-nexus-blue hover:text-nexus-cyan transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回首页
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* 左侧控制面板 */}
            <div className="space-y-8">
              <Card className="bg-[#1a2740] border-[#203042]/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-8 text-white">语音生成</h3>
                  
                  <div className="mb-8">
                    <h4 className="text-cyan-400 font-medium mb-6 text-lg">选择语音风格</h4>
                    <p className="text-gray-400 text-sm mb-6">
                      每种风格都有其独特的音色和表现力，选择最适合您内容的声音
                    </p>
                    
                    {/* Removed Tabs component as there's only one tab now */}
                    <RadioGroup 
                      value={selectedVoice} 
                      onValueChange={setSelectedVoice}
                      className="grid grid-cols-4 gap-4"
                    >
                      {pollinationsVoices.map((voice) => (
                        <div
                          key={voice.id}
                          className={`relative cursor-pointer p-4 rounded-lg border transition-all ${
                            selectedVoice === voice.id
                              ? 'border-cyan-400 bg-cyan-400/10' // Dark theme selection
                              : 'border-[#203042]/50 bg-[#1a2740] hover:bg-[#2a3750]' // Dark theme default/hover
                          }`}
                        >
                          <RadioGroupItem
                            value={voice.id}
                            id={`voice-${voice.id}`}
                            className="absolute opacity-0"
                          />
                          <label
                            htmlFor={`voice-${voice.id}`}
                            className="flex flex-col items-center cursor-pointer"
                          >
                            <div className="text-white font-medium text-sm text-center flex items-center">
                              <span className="text-lg mr-1">{voice.avatar}</span> {/* Avatar added */}
                              {voice.chineseName}
                            </div>
                            <div className="text-gray-400 text-xs text-center">{voice.name}</div>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Input area for Pollinations.ai voices */}
                  <>
                    <div className="mb-8">
                      <Label htmlFor="text-input" className="text-cyan-400 font-medium mb-4 block text-lg">
                        {isRawTextMode ? "输入文本" : (isInterpretationMode ? "输入主题" : "输入文本")}
                      </Label>
                      <Textarea
                        id="text-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={isRawTextMode ? "请输入需要转换为语音的文本..." : (isInterpretationMode ? "输入您想让AI讨论的主题..." : "请输入需要转换为语音的文本...")}
                        className="min-h-[180px] bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 resize-none focus:border-cyan-400 focus:ring-cyan-400/20"
                      />
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-gray-400 text-sm">字符数: {text.length}</p>
                        <p className="text-gray-400 text-sm">色彩节律: 不调整</p>
                      </div>
                    </div>

                    {/* Pure Text Reading Mode Switch */}
                    <div className={`flex items-center justify-between mb-4 p-4 bg-[#1a2740] rounded-lg border border-[#203042]/50 transition-opacity duration-300 ${isRawTextMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="flex items-center">
                        <MessageSquare className="h-5 w-5 text-blue-400 mr-3" />
                        <div>
                          <Label htmlFor="raw-text-mode" className="text-white font-medium">纯文本朗读模式</Label>
                          <p className="text-gray-400 text-sm">
                            AI将严格朗读您输入的文本，不进行任何额外理解或演绎。
                          </p>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Switch
                              id="raw-text-mode"
                              checked={isRawTextMode}
                              onCheckedChange={(checked) => {
                                setIsRawTextMode(checked);
                                if (checked) {
                                  setIsInterpretationMode(false); // Disable interpretation if raw text mode is on
                                }
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 text-white border-gray-700">
                            <p>开启后，AI将只朗读您输入的文本，不进行任何智能处理。</p>
                            <p>关闭后，可启用“智能演绎模式”。</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Intelligent Interpretation Switch */}
                    <div className={`flex items-center justify-between mb-8 p-4 bg-[#1a2740] rounded-lg border border-[#203042]/50 transition-opacity duration-300 ${isRawTextMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="flex items-center">
                        <Lightbulb className="h-5 w-5 text-purple-400 mr-3" />
                        <div>
                          <Label htmlFor="interpretation-mode" className="text-white font-medium">智能演绎模式</Label>
                          <p className="text-gray-400 text-sm">AI根据主题生成内容并朗读 (非对话)</p>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Switch
                              id="interpretation-mode"
                              checked={isInterpretationMode}
                              onCheckedChange={setIsInterpretationMode}
                              disabled={isRawTextMode} // Disable if raw text mode is on
                            />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 text-white border-gray-700">
                            {isRawTextMode ? (
                              <p>请先关闭“纯文本朗读模式”以启用此功能。</p>
                            ) : (
                              <p>开启后，AI会根据您输入的主题生成一段内容并朗读。</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex justify-between mb-8">
                      <Button
                        onClick={handleGenerateVoice}
                        disabled={loading || !text.trim()}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-10 py-3 text-base"
                      >
                        {loading ? "生成中..." : "生成语音"}
                      </Button>
                      <Button variant="ghost" className="text-gray-400 hover:text-gray-300">
                        按住对话 (Ctrl + ↵ Enter)
                      </Button>
                    </div>
                  </>

                  <div className="bg-[#1a2740] rounded-lg p-6 border border-[#203042]/50">
                    <h4 className="text-white font-medium mb-3 text-base">使用小技巧</h4>
                    <ul className="text-gray-400 text-sm space-y-2 list-disc pl-5">
                      <li>输入适当的可明确描述的音频的简话和语调变化</li>
                      <li>不同音频风格适合不同场景，可以尝试多种风格找到最适合的</li>
                      <li>大段文本可以分为多个短段，生成后合并，效果更佳</li>
                      <li>特殊专业术语可能需要注音或微调以获得更准确的发音</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧音频预览和历史区域 */}
            <div className="space-y-8">
              <Card className="bg-[#1a2740] border-[#203042]/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-6 text-white">音频预览</h3>
                  
                  {audioUrl ? (
                    <div className="space-y-6">
                      <div className="bg-[#1a2740] rounded-lg p-6 border border-[#203042]/50">
                        <div className="flex items-center mb-4">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center mr-4"
                            style={{ 
                              backgroundColor: voiceOptions.find(v => v.id === selectedVoice)?.color || '#8B5CF6' 
                            }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-white font-medium text-base">
                              {voiceOptions.find(v => v.id === selectedVoice)?.chineseName || '未知语音'}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {voiceOptions.find(v => v.id === selectedVoice)?.name || 'Unknown Voice'}
                            </div>
                          </div>
                        </div>
                        
                        <audio ref={audioRef} controls className="w-full mb-6" src={audioUrl}></audio>
                        
                        <div className="flex justify-end">
                          <Button 
                            onClick={() => {
                              // This is a placeholder for actual download logic
                              // In a real app, you'd fetch the audio blob and create a download link
                              window.open(audioUrl, '_blank'); // Simple open in new tab for direct URL
                              toast({
                                title: "下载开始",
                                description: "语音文件下载已开始",
                              });
                            }} 
                            className="bg-cyan-500 hover:bg-cyan-600"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            下载
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80 bg-[#1a2740] rounded-lg flex items-center justify-center border border-[#203042]/50">
                      <p className="text-gray-400 text-base">
                        {loading ? '正在生成语音，请稍等...' : '尚未生成语音'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#1a2740] border-[#203042]/50">
                <CardContent className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">历史记录</h3>
                    <Button 
                      variant="ghost" 
                      onClick={clearHistory}
                      className="text-red-400 hover:text-red-300 text-sm bg-red-400/10 hover:bg-red-400/20"
                    >
                      清空记录
                    </Button>
                  </div>
                  
                  <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
                    <p className="text-yellow-300 text-sm">
                      生成记录提醒：后台正在处理，请等待下载。
                    </p>
                  </div>

                  {history.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {history.map((item) => (
                        <div 
                          key={item.id}
                          className="bg-[#1a2740] rounded-lg p-4 border border-[#203042]/50"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-cyan-400 rounded-full mr-3"></div>
                              <span className="text-cyan-400 font-medium text-sm">
                                {voiceOptions.find(v => v.id === item.voice)?.chineseName || item.voice}
                              </span>
                              {item.isInterpretation && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-purple-400/20 text-purple-300 flex items-center">
                                  <Lightbulb className="h-3 w-3 mr-1" />演绎
                                </span>
                              )}
                            </div>
                            <span className="text-gray-400 text-xs">{formatTime(item.timestamp)}</span>
                          </div>
                          
                          <p className="text-white text-sm mb-3 line-clamp-2">{item.text}</p>
                          
                          <div className="flex justify-end">
                            <Button 
                              size="sm"
                              className="bg-cyan-500 hover:bg-cyan-600 text-xs"
                              onClick={() => {
                                if (item.audioUrl) {
                                  window.open(item.audioUrl, '_blank'); // Simple open in new tab for direct URL
                                  toast({ title: "下载开始", description: "语音文件下载已开始" });
                                } else {
                                  toast({ title: "无音频", description: "此历史记录没有可下载的音频", variant: "destructive" });
                                }
                              }}
                            >
                              下载
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400">
                        暂无历史记录
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Voice;