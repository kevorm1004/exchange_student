import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export const handleOAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userStr = urlParams.get('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(decodeURIComponent(userStr));
      const { login } = useAuth();
      const { toast } = useToast();
      
      login(token, user);
      
      // 성공 팝업 제거 - 소셜 로그인 성공 시 toast 제거
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      return false;
    }
  }
  
  return false;
};