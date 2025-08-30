// Конфигурация LiveKit
export const LIVEKIT_CONFIG = {
  // URL вашего сервера токенов
  TOKEN_SERVER_URL: "http://localhost:3001",

  // API URL для запросов
  API_URL: "http://localhost:3001",

  // WebSocket URL LiveKit сервера
  WS_URL: "ws://localhost:7880",

  // Настройки токенов
  TOKEN_TTL: "10m",

  // Настройки подключения
  CONNECTION_OPTIONS: {
    autoSubscribe: true,
    publishDefaults: {
      videoSimulcastLayers: [
        { quality: "high", width: 1280, height: 720 },
        { quality: "medium", width: 640, height: 360 },
        { quality: "low", width: 320, height: 180 },
      ],
    },
  },
};

// Проверка окружения
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Настройки для продакшена
if (isProduction) {
  LIVEKIT_CONFIG.TOKEN_SERVER_URL = "https://your-token-server.com";
  LIVEKIT_CONFIG.API_URL = "https://your-token-server.com";
  LIVEKIT_CONFIG.WS_URL = "wss://your-livekit-server.com";
}
