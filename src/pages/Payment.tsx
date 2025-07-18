import { useState, useEffect } from 'react';
import { Crown, Star, Zap, Check, Sparkles } from 'lucide-react'; // Added Sparkles
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PaymentModal from '@/components/PaymentModal';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

// Define types for MembershipPlan and Order based on Supabase schema using direct access
type MembershipPlan = Database['public']['Tables']['membership_plans']['Row'];

const Payment = () => {
  const { userProfile } = useAuth(); // Removed user, isAuthenticated, checkPaymentStatus
  const { toast } = useToast();

  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [currentPlanType, setCurrentPlanType] = useState<string>('free');

  // Fetch membership plans on component mount
  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching membership plans:', error);
        toast({
          title: "加载套餐失败",
          description: "无法获取会员套餐信息，请稍后再试。",
          variant: "destructive",
        });
      } else {
        const publicPlans = (data || []).filter(plan => plan.price > 0);
        setMembershipPlans(publicPlans);
        if (publicPlans.length > 0) {
          setSelectedPlan(publicPlans[0]);
        }
      }
    };
    fetchPlans();
  }, [toast]);

  // Update currentPlanType when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setCurrentPlanType(userProfile.membership_type || 'free');
    }
  }, [userProfile]);

  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "恭喜！升级成功",
      description: "您的账户已升级，开始享受专业服务吧！",
    });
  };

  const handleClosePaymentModal = () => { // Defined handleClosePaymentModal
    setPaymentModalOpen(false);
  };

  const getPlanPeriod = (plan: MembershipPlan) => {
    if (plan.name === '永久会员' || plan.name === '代理会员') return '/永久';
    if (plan.duration_months === 12) return '/年';
    if (plan.duration_months === 1) return '/月';
    return '';
  };

  const getPlanSubtitle = (planName: string) => {
    if (planName.includes('年度')) return '高性价比之选';
    if (planName.includes('永久')) return '一次付费，终身享用';
    if (planName.includes('代理')) return '创业合作首选';
    return '解锁无限可能';
  };

  const getPlanFeatures = (plan: MembershipPlan) => {
    if (plan.name === '年度会员') {
      return [
        '无限制AI对话',
        'Flux全家桶，无限次图像生成',
        '无限次语音合成',
        '所有功能一年内免费使用',
        '专属会员身份标识',
      ];
    } else if (plan.name === '永久会员') {
      return [
        '包含所有年度会员功能',
        '永久免费使用所有AI功能',
        '专属VIP身份标识',
        '无限制访问新功能',
        '永久免费功能更新',
      ];
    } else if (plan.name === '代理会员') {
      return [
        '包含所有永久会员功能',
        '30%推广收益分成',
        '专属代理商后台',
        '营销素材支持',
        '自动分销系统',
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#1a1f2e] to-[#0f1419]">
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-24 pb-12 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-6">
            选择会员套餐
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            解锁全部AI超能力，开启无限创作之旅
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span className="text-gray-300 ml-2">已有1000+用户选择我们</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {membershipPlans.map((plan) => (
            <div key={plan.id} className="relative group cursor-pointer transition-all duration-300 hover:scale-102">
              {plan.name.includes('年度') && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                    <Sparkles className="w-3 h-3 mr-1" />
                    推荐
                  </div>
                </div>
              )}
              
              <div className={`relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl border-2 ${
                plan.name.includes('年度') ? 'border-purple-400 shadow-2xl shadow-purple-500/25' : 'border-gray-700 hover:border-cyan-400/50'
              } rounded-3xl p-6 transition-all duration-300`}>
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <Crown className={`w-5 h-5 ${plan.name.includes('年度') ? 'text-purple-400' : 'text-cyan-400'} mr-2`} />
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  </div>
                  <p className="text-gray-400 mb-4 text-sm">{getPlanSubtitle(plan.name)}</p>
                  
                  <div className="mb-4">
                    <span className={`text-3xl font-bold bg-clip-text text-transparent ${
                      plan.name.includes('年度') ? 'bg-gradient-to-r from-purple-400 to-pink-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                    }`}>
                      ¥{plan.price.toFixed(2)}
                    </span>
                    <span className="text-gray-400 text-sm ml-2">{getPlanPeriod(plan)}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-4">
                    {plan.duration_months === 12 ? `平均每月仅需 ¥${(plan.price / 12).toFixed(2)}` : ''}
                    {plan.name === '永久会员' ? `相当于${(plan.price / 99).toFixed(1)}年年费，超值划算` : ''}
                    {plan.name === '代理会员' ? `推广${Math.ceil(plan.price / (plan.price * 0.3))}单即可回本` : ''}
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  {getPlanFeatures(plan).map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className={`w-4 h-4 ${plan.name.includes('年度') ? 'text-purple-400' : 'text-cyan-400'} mr-2 flex-shrink-0`} />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="text-center">
                  <Button 
                    onClick={() => handleSelectPlan(plan)}
                    disabled={currentPlanType === plan.type || (userProfile?.membership_type === 'lifetime' && plan.name !== '代理会员')}
                    className={`w-full font-bold py-3 rounded-xl text-sm transition-all duration-300 ${
                      plan.name.includes('年度') ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
                    }`}
                  >
                    {currentPlanType === plan.type ? '当前套餐' : '立即购买'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mt-20 max-w-4xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-center text-2xl">功能详细对比</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                选择最适合您需求的套餐
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-4 text-white font-semibold">功能</th>
                      <th className="text-center py-4 text-white font-semibold">年度会员</th>
                      <th className="text-center py-4 text-white font-semibold">永久会员</th>
                      <th className="text-center py-4 text-white font-semibold">代理会员</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-700">
                      <td className="py-4 text-gray-300">AI对话次数</td>
                      <td className="text-center text-green-400">无限</td>
                      <td className="text-center text-green-400">无限</td>
                      <td className="text-center text-green-400">无限</td>
                    </tr>
                    <tr className="border-b border-slate-700">
                      <td className="py-4 text-gray-300">专属权限</td>
                      <td className="text-center text-green-400">Plus权限</td>
                      <td className="text-center text-green-400">VIP权限</td>
                      <td className="text-center text-green-400">代理权限</td>
                    </tr>
                    <tr className="border-b border-slate-700">
                      <td className="py-4 text-gray-300">收益分成</td>
                      <td className="text-center text-gray-500">-</td>
                      <td className="text-center text-gray-500">-</td>
                      <td className="text-center text-green-400">30%</td>
                    </tr>
                    <tr className="border-b border-slate-700">
                      <td className="py-4 text-gray-300">使用期限</td>
                      <td className="text-center text-yellow-400">1年</td>
                      <td className="text-center text-green-400">永久</td>
                      <td className="text-center text-green-400">永久</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          open={paymentModalOpen}
          onClose={handleClosePaymentModal}
          selectedPlan={selectedPlan}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Payment;