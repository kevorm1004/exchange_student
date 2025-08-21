import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      window.location.href = "/auth/login";
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="설정" showSearch={false} showNotifications={true} />
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              설정
            </h2>
            <p className="text-gray-600 mb-4">
              준비 중인 페이지입니다.
            </p>
            <p className="text-sm text-gray-500">
              곧 알림 설정, 개인정보 설정, 언어 설정 등을 관리할 수 있게 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}