import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import { useEffect } from "react";

export default function MyReviewsPage() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      window.location.href = "/auth/login";
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="리뷰 관리" showSearch={false} showNotifications={true} />
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              리뷰 관리
            </h2>
            <p className="text-gray-600 mb-4">
              준비 중인 페이지입니다.
            </p>
            <p className="text-sm text-gray-500">
              곧 받은 리뷰와 작성한 리뷰를 관리할 수 있게 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}