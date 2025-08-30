const express = require("express");
const { AccessToken } = require("livekit-server-sdk");
const cors = require("cors");

const app = express();

// Расширенная настройка CORS для разработки
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite по умолчанию
      "http://localhost:5174", // Vite альтернативный порт
      "http://localhost:3000", // React/Next.js
      "http://127.0.0.1:5173", // Локальный IP
      "http://127.0.0.1:5174", // Локальный IP альтернативный
      "http://127.0.0.1:3000", // Локальный IP React
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Дополнительная настройка CORS заголовков
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // Обработка preflight запросов
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

app.use(express.json());

// ВАЖНО: Эти ключи должны совпадать с вашим livekit.yaml
const API_KEY = "devkey"; // 👈 Ваш API ключ из livekit.yaml
const API_SECRET = "secret"; // 👈 Ваш API секрет из livekit.yaml

// Middleware для логирования запросов
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    `[${timestamp}] ${req.method} ${req.path} - Origin: ${
      req.headers.origin || "не указан"
    }`
  );
  next();
});

// Эндпоинт для генерации токенов
app.post("/getToken", (req, res) => {
  try {
    const { room, username, permissions = {} } = req.body;

    console.log("📝 Запрос токена:", { room, username, permissions });

    if (!room || !username) {
      console.log("❌ Отсутствуют обязательные параметры");
      return res.status(400).json({
        error: "Необходимо указать room и username",
      });
    }

    // Создание токена доступа
    const token = new AccessToken(API_KEY, API_SECRET, {
      identity: username,
      ttl: "10m", // Токен действует 10 минут
    });

    // Добавление разрешений
    token.addGrant({
      room: room,
      roomJoin: true,
      canPublish: permissions.canPublish !== false,
      canSubscribe: permissions.canSubscribe !== false,
      canPublishData: permissions.canPublishData !== false,
      canUpdateMetadata: permissions.canUpdateMetadata || false,
    });

    const jwt = token.toJwt();

    console.log("✅ Токен создан успешно для:", { room, username });

    res.json({
      token: jwt,
      expires: Date.now() + 10 * 60 * 1000, // 10 минут
    });
  } catch (error) {
    console.error("❌ Ошибка создания токена:", error);
    res.status(500).json({
      error: "Ошибка создания токена",
      details: error.message,
    });
  }
});

// Проверка здоровья сервера
app.get("/health", (req, res) => {
  console.log("🏥 Проверка здоровья сервера");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: "LiveKit Token Server",
    version: "1.0.0",
    cors: {
      origin: req.headers.origin || "не указан",
      allowed: true,
    },
    livekit: {
      apiKey: API_KEY,
      serverUrl: "ws://localhost:7880",
    },
  });
});

// Информация о сервере
app.get("/", (req, res) => {
  console.log("ℹ️ Запрос информации о сервере");
  res.json({
    message: "LiveKit Token Server",
    version: "1.0.0",
    status: "running",
    cors: {
      enabled: true,
      allowedOrigins: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
      ],
    },
    endpoints: {
      "/": "GET - Информация о сервере",
      "/health": "GET - Проверка состояния сервера",
      "/getToken": "POST - Получить токен доступа",
    },
    config: {
      apiKey: API_KEY,
      livekitServer: "ws://localhost:7880",
      port: process.env.PORT || 3001,
    },
    usage: {
      getToken: {
        method: "POST",
        url: "/getToken",
        body: {
          room: "название-комнаты",
          username: "имя-пользователя",
          permissions: {
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
          },
        },
      },
    },
  });
});

// Обработка ошибок 404
app.use("*", (req, res) => {
  console.log("❌ 404 - Путь не найден:", req.originalUrl);
  res.status(404).json({
    error: "Путь не найден",
    path: req.originalUrl,
    availableEndpoints: ["/", "/health", "/getToken"],
  });
});

// Обработка общих ошибок
app.use((error, req, res, next) => {
  console.error("💥 Серверная ошибка:", error);
  res.status(500).json({
    error: "Внутренняя ошибка сервера",
    message: error.message,
  });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Получен сигнал SIGINT. Завершение работы сервера...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Получен сигнал SIGTERM. Завершение работы сервера...");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("🚀 LiveKit Token Server запущен!");
  console.log("=".repeat(60));
  console.log("📡 Порт:", PORT);
  console.log("🌐 URL:", `http://localhost:${PORT}`);
  console.log("🔑 API Key:", API_KEY);
  console.log(
    "🔐 API Secret:",
    API_SECRET ? "***" + API_SECRET.slice(-4) : "не установлен"
  );
  console.log("📺 LiveKit Server:", "ws://localhost:7880");
  console.log("");
  console.log("🌍 CORS настроен для:");
  console.log("  - http://localhost:5173 (Vite по умолчанию)");
  console.log("  - http://localhost:5174 (Vite альтернативный)");
  console.log("  - http://localhost:3000 (React/Next.js)");
  console.log("  - http://127.0.0.1:5173");
  console.log("  - http://127.0.0.1:5174");
  console.log("");
  console.log("Доступные эндпоинты:");
  console.log("  GET  / - Информация о сервере");
  console.log("  GET  /health - Проверка состояния");
  console.log("  POST /getToken - Получение токена");
  console.log("");
  console.log("Для остановки нажмите Ctrl+C");
  console.log("=".repeat(60));
});
