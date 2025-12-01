'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface PaystackPaymentButtonProps {
    config: any;
    disabled?: boolean;
    loading?: boolean;
    amount: number;
}

export default function PaystackPaymentButton({ config, disabled, loading, amount }: PaystackPaymentButtonProps) {
    // Extract callbacks to pass to initializePayment
    const { onSuccess, onClose, ...paystackConfig } = config;

    const initializePayment = usePaystackPayment(paystackConfig);

    const handlePay = () => {
        initializePayment({
            onSuccess: (reference: any) => onSuccess(reference),
            onClose: () => onClose()
        });
    };

    return (
        <Button
            type="button"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg font-semibold rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed h-auto"
            disabled={disabled}
            onClick={handlePay}
        >
            {loading ? (
                <>
                    <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing Order...
                </>
            ) : (
                <>
                    <Lock className="w-5 h-5 mr-2" />
                    Pay ₦{amount.toLocaleString()} with Paystack
                </>
            )}
        </Button>
    );
}
