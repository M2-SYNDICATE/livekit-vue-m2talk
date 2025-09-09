# 📹 m2-talk  

Видеоконференции для AI HR звонков на базе **LiveKit**  

🔗 Полная интсрукция: [Инструкция](https://github.com/M2-SYNDICATE/back-m2-moder-panel/blob/unstable/README.md)

---

## 🚀 Быстрый старт

### 1. Настройка проекта

Перейдите в файл **`src/config/livekit.ts`** и замените содержимое на следующее:

```ts
// Конфигурация LiveKit
export const LIVEKIT_CONFIG = {
  // URL вашего сервера токенов
  TOKEN_SERVER_URL: "http://",

  // API URL для запросов
  API_URL: "http://",

  // WebSocket URL LiveKit сервера
  WS_URL: "ws://",
};

// Настройки для продакшена
if (isProduction) {
  LIVEKIT_CONFIG.TOKEN_SERVER_URL = "http://";
  LIVEKIT_CONFIG.API_URL = "http://";
  LIVEKIT_CONFIG.WS_URL = "wss://";
}
```

---

### 2. Настройка Token Server

Перейдите в файл **`token-server/server.js`** и замените API-ключи на свои из `livekit.yaml`:

```js
const API_KEY = "";    // 👈 Ваш API ключ из livekit.yaml
const API_SECRET = ""; // 👈 Ваш API секрет из livekit.yaml
```

---

### 3. Запуск проекта

#### 🔹 Запуск фронтенда
```bash
npm install
npm run build
```

#### 🔹 Запуск Token Server
```bash
cd token-server
node server.js
```

#### 🔹 Запуск LiveKit сервера
```bash
./livekit-server --config livekit.yaml
```

---

## 📂 Структура проекта
```
m2-talk/
│── src/                # Исходный код фронтенда
│   └── config/
│       └── livekit.ts  # Конфигурация LiveKit
│
│── token-server/       # Сервер для генерации токенов
│   └── server.js
│
│── package.json
│── README.md
```

---

## 🌐 Ссылки

- [LiveKit Docs](https://docs.livekit.io/)
- [LiveKit GitHub](https://github.com/livekit)

---

💡 Теперь вы можете подключаться к видеоконференциям и использовать m2-talk для AI HR звонков!
