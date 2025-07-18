import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Gift, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ExperienceCard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);

  const isFreeUser = userProfile?.membership_type === 'free';
  const isFreeTrialUser = userProfile?.membership_type === 'free_trial';
  const hasClaimedTrial = userProfile?.membership_expires_at && new Date(userProfile.membership_expires_at) > new Date();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFreeTrialUser && userProfile?.membership_expires_at) {
      const expiryDate = new Date(userProfile.membership_expires_at).getTime();
      const updateRemainingTime = () => {
        const now = new Date().getTime();
        const timeLeft = expiryDate - now;

        if (timeLeft <= 0) {
          setRemainingTime('已过期');
          clearInterval(timer);
          // Optionally, trigger a profile refresh if expired
          // supabase.auth.refreshSession();
        } else {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          setRemainingTime(`${days}天${hours}小时${minutes}分`);
        }
      };

      updateRemainingTime();
      timer = setInterval(updateRemainingTime, 60000); // Update every minute
    } else {
      setRemainingTime(null);
    }

    return () => clearInterval(timer);
  }, [isFreeTrialUser, userProfile?.membership_expires_at]);

  const handleClaimExperience = async () => {
    if (!user || authLoading) {
      toast({ title: "请先登录", description: "登录后才能领取体验卡", variant: "destructive" });
      return;
    }
    if (!isFreeUser) {
      toast({ title: "无法领取", description: "您已是会员或已领取过体验卡", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const SUPABASE_PROJECT_REF = 'gwueqkusxarhomnabcrg'; // Your Supabase Project ID
      const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/claim-experience`;

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "领取成功",
          description: "7天免费体验卡已激活！",
        });
        // Trigger AuthContext to re-fetch user profile
        supabase.auth.refreshSession();
      } else {
        throw new Error(result.error || '领取失败');
      }
    } catch (error: any) {
      console.error('领取体验卡失败:', error);
      toast({
        title: "领取失败",
        description: error.message || "领取失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return null; // Or a loading spinner
  }

  if (isFreeTrialUser && hasClaimedTrial) {
    return (
      <Card className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              体验卡已激活
            </CardTitle>
            <Badge className="bg-white/20 text-white">
              7天免费
            </Badge>
          </div>
          <CardDescription className="text-white/80">
            您的免费体验已开启，尽情探索所有专业功能！
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">剩余时间: {remainingTime}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast({ title: "体验卡", description: "您正在免费体验中！" })}>
              查看详情
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isFreeUser) {
    return (
      <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              免费体验卡
            </CardTitle>
            <Badge className="bg-white/20 text-white">
              限时领取
            </Badge>
          </div>
          <CardDescription className="text-white/80">
            新用户专享：7天免费体验所有专业功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              <span>无限制AI对话</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Flux全家桶，无限次图像生成</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              <span>无限次语音合成</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              <span>所有AI工具箱功能</span>
            </div>
          </div>
          <Button
            onClick={handleClaimExperience}
            disabled={loading || authLoading}
            className="w-full bg-white text-purple-600 hover:bg-gray-100 font-semibold"
          >
            {loading ? '领取中...' : '立即领取免费体验'}
          </Button>
          <p className="text-xs text-white/70 text-center">
            * 每个用户仅限领取一次，体验期结束后可升级为正式会员
          </p>
        </CardContent>
      </Card>
    );
  }

  return null; // Don't render if not a free user or already claimed/paid
};

export default ExperienceCard;