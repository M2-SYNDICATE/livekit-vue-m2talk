import { LIVEKIT_CONFIG } from "../config/livekit";

// Интерфейс для данных токена
interface TokenRequest {
  room: string;
  username: string;
  permissions?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    canUpdateMetadata?: boolean;
  };
}

// Интерфейс ответа с токеном
interface TokenResponse {
  token: string;
  expires?: number;
}

// Класс для работы с LiveKit API
export class LiveKitService {
  // Проверка здоровья сервера
  static async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${LIVEKIT_CONFIG.API_URL}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return response.ok;
    } catch (error) {
      console.error("Ошибка проверки сервера:", error);
      return false;
    }
  }

  // Получение токена доступа
  static async getAccessToken(room: string, username: string): Promise<string> {
    if (!room || !username) {
      throw new Error("Необходимо указать название комнаты и имя пользователя");
    }

    console.log("Запрос токена для:", { room, username });

    const requestData: TokenRequest = {
      room: room.trim(),
      username: username.trim(),
      permissions: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateMetadata: false,
      },
    };

    try {
      const response = await fetch(`${LIVEKIT_CONFIG.API_URL}/getToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
      }

      const data: TokenResponse = await response.json();

      if (!data.token) {
        throw new Error("Сервер не вернул токен");
      }

      console.log("Токен получен успешно");
      return data.token;
    } catch (error) {
      console.error("Ошибка получения токена:", error);
      throw error;
    }
  }

  // Валидация названия комнаты
  static validateRoomName(roomName: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!roomName || !roomName.trim()) {
      return { isValid: false, error: "Введите название комнаты" };
    }

    const trimmed = roomName.trim();

    if (trimmed.length < 3) {
      return {
        isValid: false,
        error: "Название комнаты должно содержать минимум 3 символа",
      };
    }

    if (trimmed.length > 50) {
      return {
        isValid: false,
        error: "Название комнаты не должно превышать 50 символов",
      };
    }

    // Разрешены только буквы, цифры, дефисы и подчеркивания
    const validPattern = /^[a-zA-Z0-9\-_\u0400-\u04FF\s]+$/;
    if (!validPattern.test(trimmed)) {
      return {
        isValid: false,
        error:
          "Название может содержать только буквы, цифры, дефисы и подчеркивания",
      };
    }

    return { isValid: true };
  }

  // Валидация имени пользователя
  static validateUsername(username: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!username || !username.trim()) {
      return { isValid: false, error: "Введите ваше имя" };
    }

    const trimmed = username.trim();

    if (trimmed.length < 2) {
      return {
        isValid: false,
        error: "Имя должно содержать минимум 2 символа",
      };
    }

    if (trimmed.length > 30) {
      return { isValid: false, error: "Имя не должно превышать 30 символов" };
    }

    // Разрешены буквы, цифры, пробелы
    const validPattern = /^[a-zA-Z0-9\u0400-\u04FF\s]+$/;
    if (!validPattern.test(trimmed)) {
      return {
        isValid: false,
        error: "Имя может содержать только буквы, цифры и пробелы",
      };
    }

    return { isValid: true };
  }
}
