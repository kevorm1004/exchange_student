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
      
      toast({
        title: "로그인 성공",
        description: "소셜 로그인이 완료되었습니다!",
      });
      
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