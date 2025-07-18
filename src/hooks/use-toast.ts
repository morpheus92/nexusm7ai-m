import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
}

// Define our toast interface
export interface Toast extends ToastProps {
  id: string;
}

// Create a dummy implementation that doesn't actually store toasts 
// since we're using Sonner toast under the hood
export const toast = ({
  title,
  description,
  variant = "default",
  duration = 3000,
  action,
}: ToastProps) => {
  // Convert variant to sonner style
  const type = 
    variant === "destructive" ? "error" :
    variant === "success" ? "success" : 
    variant === "warning" ? "warning" :
    variant === "info" ? "info" : "message"; // Map 'default' to 'message' for sonnerToast

  return sonnerToast[type](title, {
    description,
    duration,
    action,
  });
};

export const useToast = () => {
  // Since we're using sonner under the hood and it manages its own toast state,
  // we'll provide an empty array for compatibility
  return {
    toast,
    toasts: [] as Toast[],
  };
};