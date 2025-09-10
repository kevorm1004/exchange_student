import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '20px', background: 'lightgreen', minHeight: '100vh' }}>
        <h1>교환마켓 - 간단 테스트</h1>
        <p>React 앱이 정상 로드되었습니다!</p>
        <p>현재 시간: {new Date().toLocaleString()}</p>
      </div>
    </QueryClientProvider>
  );
}

export default App;