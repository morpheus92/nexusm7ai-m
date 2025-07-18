import { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Image, Volume2, Crown, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Updated import path for UserProfile
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

interface UsageStats {
  chat: { used: number; total: number };
  image: { used: number; total: number };
  voice: { used: number; total: number };
}

interface UsageTrackerProps {
  onUsageUpdate?: (stats: UsageStats) => void;
}

const UsageTracker = ({ onUsageUpdate }: UsageTrackerProps) => {
  const { user, userProfile } = useAuth(); // Get userProfile from AuthContext
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageStats>({
    chat: { used: 0, total: 10 },
    image: { used: 0, total: 10 },
    voice: { used: 0, total: 10 }
  });

  // Check if user is a paid member based on userProfile
  const isPaidUser = userProfile?.membership_type !== 'free';

  useEffect(() => {
    if (user) {
      loadUsageStats();
    }
  }, [user, userProfile]); // 添加 userProfile 到依赖数组

  const loadUsageStats = () => {
    if (!user) return;

    try {
      // 加载聊天使用情况
      const chatUsage = localStorage.getItem(`chat_usage_${user.id}`);
      const chatUsed = chatUsage ? parseInt(chatUsage) : 0;

      // 加载图像使用情况
      const imageUsage = JSON.parse(localStorage.getItem(`nexusAi_image_usage_${user.id}`) || '{"remaining": 10}');
      const imageUsed = 10 - imageUsage.remaining;

      // 加载语音使用情况  
      const voiceUsage = JSON.parse(localStorage.getItem(`nexusAi_voice_usage_${user.id}`) || '{"remaining": 10}');
      const voiceUsed = 10 - voiceUsage.remaining;

      const newUsage = {
        chat: { used: chatUsed, total: 10 },
        image: { used: Math.max(0, imageUsed), total: 10 },
        voice: { used: Math.max(0, voiceUsed), total: 10 }
      };

      setUsage(newUsage);
      onUsageUpdate?.(newUsage);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const calculatePercentage = (used: number, total: number) => {
    return Math.min(Math.round((used / total) * 100), 100);
  };

  const getUsageColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-nexus-cyan';
  };

  if (isPaidUser) {
    return (
      <div className="bg-gradient-to-br from-nexus-dark/80 to-nexus-purple/30 backdrop-blur-sm rounded-xl border border-nexus-blue/20 p-6">
        <div className="flex items-center justify-center text-center">
          <Crown className="h-8 w-8 text-yellow-500 mr-3" />
          <div>
            <h3 className="text-xl font-bold text-gradient mb-2">VIP 会员</h3>
            <p className="text-white/80">享受无限制AI服务</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-nexus-dark/80 to-nexus-purple/30 backdrop-blur-sm rounded-xl border border-nexus-blue/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">使用额度</h3>
        <Button 
          onClick={() => navigate('/payment')}
          size="sm"
          className="bg-nexus-blue hover:bg-nexus-blue/80 text-xs"
        >
          升级VIP
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* AI对话额度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 text-nexus-cyan mr-2" />
              <span className="text-white text-sm">AI对话额度</span>
            </div>
            <span className="text-white/80 text-sm">
              {usage.chat.used} / {usage.chat.total}
            </span>
          </div>
          <Progress 
            value={calculatePercentage(usage.chat.used, usage.chat.total)} 
            className={`h-2 ${getUsageColor(usage.chat.used, usage.chat.total)}`}
          />
        </div>

        {/* AI图像额度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image className="h-4 w-4 text-nexus-cyan mr-2" />
              <span className="text-white text-sm">AI图像额度</span>
            </div>
            <span className="text-white/80 text-sm">
              {usage.image.used} / {usage.image.total}
            </span>
          </div>
          <Progress 
            value={calculatePercentage(usage.image.used, usage.image.total)} 
            className={`h-2 ${getUsageColor(usage.image.used, usage.image.total)}`}
          />
        </div>

        {/* AI语音额度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Volume2 className="h-4 w-4 text-nexus-cyan mr-2" />
              <span className="text-white text-sm">AI语音额度</span>
            </div>
            <span className="text-white/80 text-sm">
              {usage.voice.used} / {usage.voice.total}
            </span>
          </div>
          <Progress 
            value={calculatePercentage(usage.voice.used, usage.voice.total)} 
            className={`h-2 ${getUsageColor(usage.voice.used, usage.voice.total)}`}
          />
        </div>
      </div>

      {(usage.chat.used >= usage.chat.total || 
        usage.image.used >= usage.image.total || 
        usage.voice.used >= usage.voice.total) && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm text-center">
            部分功能已达使用上限，升级VIP享受无限制服务
          </p>
        </div>
      )}
    </div>
  );
};

export default UsageTracker;