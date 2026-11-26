import { useEffect, useState } from 'react';

export function useWebSocket() {
  const [liveData, setLiveData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the FastAPI WebSocket
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'telemetry') {
        setLiveData(message.data);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { liveData, isConnected };
}