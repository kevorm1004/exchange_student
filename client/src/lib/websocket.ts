export class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  constructor(private token: string) {
    this.connect();
  }

  private connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      // Authenticate the connection
      this.send({
        type: 'auth',
        token: this.token
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handler = this.messageHandlers.get(data.type);
        if (handler) {
          handler(data);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    }
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(messageType: string, handler: (data: any) => void) {
    this.messageHandlers.set(messageType, handler);
    
    return () => {
      this.messageHandlers.delete(messageType);
    };
  }

  disconnect() {
    this.ws?.close();
  }
}
