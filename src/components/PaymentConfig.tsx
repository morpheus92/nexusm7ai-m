import { useState, useEffect } from 'react';
import { Settings, Save, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

const PaymentConfig = () => {
  const [config, setConfig] = useState({
    alipay_app_id: '',
    alipay_private_key: '',
    alipay_public_key: '',
    alipay_gateway_url: 'https://openapi.alipay.com/gateway.do',
    notify_url: '',
    return_url: ''
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'alipay_app_id', 'alipay_private_key', 'alipay_public_key',
            'alipay_gateway_url', 'notify_url', 'return_url'
          ]);

        if (error) throw error;

        const fetchedConfig: any = {};
        data.forEach(item => {
          fetchedConfig[item.setting_key] = item.setting_value;
        });

        setConfig(prev => ({
          ...prev,
          ...fetchedConfig,
          alipay_gateway_url: fetchedConfig.alipay_gateway_url || 'https://openapi.alipay.com/gateway.do' // Default value
        }));
      } catch (error: any) {
        console.error('Error fetching payment config:', error);
        toast({
          title: "加载配置失败",
          description: error.message || "无法加载支付配置信息",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Call the Edge Function to save config
      const SUPABASE_PROJECT_REF = 'gwueqkusxarhomnabcrg'; // Your Supabase Project ID
      const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/save-payment-config`;

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header might be needed if function is protected
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "配置保存成功",
          description: "支付宝配置已更新",
        });
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (error: any) {
      console.error('Error saving payment config:', error);
      toast({
        title: "保存失败",
        description: error.message || "请检查配置信息",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-white">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">支付配置管理</h2>
      </div>

      <Tabs defaultValue="alipay" className="w-full">
        <TabsList className="bg-[#2a3750]">
          <TabsTrigger value="alipay" className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-200">支付宝配置</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-200">回调设置</TabsTrigger>
        </TabsList>

        <TabsContent value="alipay">
          <Card className="bg-[#1a2740] border-[#203042]/60 text-white">
            <CardHeader>
              <CardTitle>支付宝应用信息</CardTitle>
              <CardDescription className="text-gray-400">
                请在支付宝开放平台获取应用信息并填入以下配置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app_id">应用 ID (App ID)</Label>
                <Input
                  id="app_id"
                  value={config.alipay_app_id}
                  onChange={(e) => setConfig({...config, alipay_app_id: e.target.value})}
                  placeholder="请输入支付宝应用ID"
                  className="bg-[#14202c] border-[#2e4258] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="private_key">应用私钥 (Private Key)</Label>
                <div className="relative">
                  <Textarea
                    id="private_key"
                    value={config.alipay_private_key}
                    onChange={(e) => setConfig({...config, alipay_private_key: e.target.value})}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                    className="min-h-32 bg-[#14202c] border-[#2e4258] text-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 text-gray-400 hover:text-white"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="public_key">支付宝公钥 (Alipay Public Key)</Label>
                <Textarea
                  id="public_key"
                  value={config.alipay_public_key}
                  onChange={(e) => setConfig({...config, alipay_public_key: e.target.value})}
                  placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                  className="min-h-32 bg-[#14202c] border-[#2e4258] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gateway_url">网关地址</Label>
                <Input
                  id="gateway_url"
                  value={config.alipay_gateway_url}
                  onChange={(e) => setConfig({...config, alipay_gateway_url: e.target.value})}
                  placeholder="https://openapi.alipay.com/gateway.do"
                  className="bg-[#14202c] border-[#2e4258] text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-[#1a2740] border-[#203042]/60 text-white">
            <CardHeader>
              <CardTitle>回调设置</CardTitle>
              <CardDescription className="text-gray-400">
                配置支付成功后的回调地址
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notify_url">异步通知地址 (Notify URL)</Label>
                <Input
                  id="notify_url"
                  value={config.notify_url}
                  onChange={(e) => setConfig({...config, notify_url: e.target.value})}
                  placeholder="https://your-domain.com/api/alipay/notify"
                  className="bg-[#14202c] border-[#2e4258] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="return_url">同步返回地址 (Return URL)</Label>
                <Input
                  id="return_url"
                  value={config.return_url}
                  onChange={(e) => setConfig({...config, return_url: e.target.value})}
                  placeholder="https://your-domain.com/payment/success"
                  className="bg-[#14202c] border-[#2e4258] text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
        <Save className="h-4 w-4 mr-2" />
        {loading ? '保存中...' : '保存配置'}
      </Button>
    </div>
  );
};

export default PaymentConfig;