import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import React from 'react';

type MembershipPlan = Database['public']['Tables']['membership_plans']['Row'];

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  selectedPlan: MembershipPlan | null;
  onPaymentSuccess: () => void; // Keep in interface for external usage
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onClose, selectedPlan }) => { // Removed onPaymentSuccess from destructuring
  // For now, we'll simulate a pending state and then a "maintenance" message.
  // In a real app, this would involve calling a backend API to initiate payment.
  const [paymentStatus, setPaymentStatus] = React.useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');

  React.useEffect(() => {
    if (open) {
      setPaymentStatus('pending');
      // Simulate a short loading time, then show maintenance message
      const timer = setTimeout(() => {
        setPaymentStatus('idle'); // Revert to idle, but the message will be "维护中"
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setPaymentStatus('idle'); // Reset when modal closes
    }
  }, [open]);

  if (!selectedPlan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-3xl p-6 max-w-sm w-full relative text-center text-white">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white mb-4">
            {paymentStatus === 'pending' ? '正在准备支付...' : '支付功能维护中'}
          </DialogTitle>
        </DialogHeader>
        
        {paymentStatus === 'pending' ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-6" />
            <p className="text-gray-300 mb-4">
              正在为您生成订单，请稍候...
            </p>
          </>
        ) : (
          <>
            <X className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <p className="text-red-300 text-lg mb-4">
              当前支付功能正在升级维护，请稍后再试或联系客服。
            </p>
            <p className="text-gray-500 text-xs mt-4">
              感谢您的理解与支持。
            </p>
            <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 mt-6">
              关闭
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;