<script setup lang="ts">
import { reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { LiveKitService } from "../services/livekitService";
import TimeComponent from "./Time.vue";

const router = useRouter();

const form = reactive({
  roomName: "",
  participantName: "",
});

const state = reactive({
  isLoading: false,
  serverStatus: "checking" as "checking" | "online" | "offline",
  error: "",
});

const checkServerStatus = async () => {
  state.serverStatus = "checking";
  const isOnline = await LiveKitService.checkServerHealth();
  state.serverStatus = isOnline ? "online" : "offline";
};

const validateForm = () => {
  // Валидация названия комнаты
  const roomValidation = LiveKitService.validateRoomName(form.roomName);
  if (!roomValidation.isValid) {
    state.error = roomValidation.error || "Некорректное название комнаты";
    return false;
  }

  // Валидация имени пользователя
  const usernameValidation = LiveKitService.validateUsername(
    form.participantName
  );
  if (!usernameValidation.isValid) {
    state.error = usernameValidation.error || "Некорректное имя пользователя";
    return false;
  }

  return true;
};

const joinRoom = async () => {
  state.error = "";

  if (!validateForm()) return;

  state.isLoading = true;

  try {
    // ВАЖНО: Больше не передаем уникальный identity вручную,
    // LiveKitService сам сгенерирует его на основе username + timestamp/random
    const token = await LiveKitService.getAccessToken(
      form.roomName.trim(),
      form.participantName.trim()
      // Уникальный identity будет сгенерирован внутри getAccessToken
    );

    await router.push({
      name: "VideoCall",
      query: {
        roomName: form.roomName.trim(),
        participantName: form.participantName.trim(),
        token,
      },
    });
  } catch (error: any) {
    console.error("Ошибка подключения:", error);
    let errorMessage = "Не удалось подключиться к комнате";
    if (error.message) {
      if (
        error.message.includes("room not found") ||
        error.message.includes("not found") ||
        error.message.includes("does not exist")
      ) {
        errorMessage = `Комната "${form.roomName.trim()}" не найдена.`;
      } else if (
        error.message.includes("Unauthorized") ||
        error.message.includes("token") ||
        error.message.includes("access")
      ) {
        errorMessage = "Ошибка аутентификации. Проверьте имя пользователя.";
      } else if (
        error.message.includes("max participants") ||
        error.message.includes("full")
      ) {
        errorMessage = `Комната "${form.roomName.trim()}" заполнена.`;
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    state.error = errorMessage;
  } finally {
    state.isLoading = false;
  }
};

const createRoom = async () => {
  const randomRoomName = `room-${Math.random().toString(36).substring(2, 8)}`;
  form.roomName = randomRoomName;

  if (form.participantName.trim()) {
    // Для случайных комнат тоже уникальный identity будет сгенерирован
    await joinRoom();
  } else {
    state.error = "Пожалуйста, введите ваше имя.";
  }
};

const goBack = () => {
  router.push("/");
};

// Вычисляем, нужно ли показывать плашку
const isMaintenancePeriod = computed(() => {
  // Получаем текущее время в часовом поясе Москвы
  const moscowTime = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());

  // Извлекаем час из строки вида "14" или "05"
  const hour = parseInt(moscowTime.split(":")[0], 10);

  // Показываем плашку, если время от 00:00 до 07:59:59
  return hour >= 0 && hour < 1;
});

onMounted(() => {
  checkServerStatus();
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
  >
    <Transition name="fade">
      <TimeComponent />
    </Transition>

    <div class="max-w-md w-full">
      <!-- Кнопка назад -->
      <button
        @click="goBack"
        class="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg
          class="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Назад
      </button>

      <!-- Заголовок -->
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
        >
          <svg
            class="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          Подключение к комнате
        </h1>
        <p class="text-gray-600">
          Создайте новую комнату или подключитесь к существующей
        </p>
      </div>

      <!-- Статус сервера -->
      <div class="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700">Статус сервера</span>
          <div class="flex items-center">
            <div
              class="w-2 h-2 rounded-full mr-2"
              :class="{
                'bg-yellow-400 animate-pulse':
                  state.serverStatus === 'checking',
                'bg-green-400': state.serverStatus === 'online',
                'bg-red-400': state.serverStatus === 'offline',
              }"
            ></div>
            <span class="text-sm text-gray-600">
              {{
                state.serverStatus === "checking"
                  ? "Проверка..."
                  : state.serverStatus === "online"
                  ? "Онлайн"
                  : "Недоступен"
              }}
            </span>
            <button
              v-if="state.serverStatus === 'offline'"
              @click="checkServerStatus"
              class="ml-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>

      <!-- Форма -->
      <form
        @submit.prevent="joinRoom"
        class="bg-white rounded-2xl shadow-xl p-6"
      >
        <!-- Ошибка -->
        <div
          v-if="state.error"
          class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
        >
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-red-400 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-sm text-red-700">{{ state.error }}</p>
          </div>
        </div>

        <!-- Поля формы -->
        <div class="space-y-4 mb-6">
          <div>
            <label
              for="roomName"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Название комнаты
            </label>
            <input
              id="roomName"
              v-model="form.roomName"
              type="text"
              placeholder="Введите название комнаты"
              class="w-full px-<Thinking> Пользователь просит продолжить генерацию кода с того места, где я остановился. Я остановился на компоненте JoinRoom.vue в середине input элемента. Нужно продолжить именно с этого места без повторения уже написанного кода. </Thinking> 4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              :disabled="state.isLoading"
              maxlength="50"
              autofocus
            />
            <p class="mt-1 text-xs text-gray-500">
              От 3 до 50 символов. Разрешены буквы, цифры, дефисы и
              подчеркивания.
            </p>
          </div>

          <div>
            <label
              for="participantName"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Ваше имя
            </label>
            <input
              id="participantName"
              v-model="form.participantName"
              type="text"
              placeholder="Введите ваше имя"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              :disabled="state.isLoading"
              maxlength="30"
            />
            <p class="mt-1 text-xs text-gray-500">
              От 2 до 30 символов. Разрешены буквы, цифры и пробелы.
            </p>
          </div>
        </div>

        <!-- Кнопки -->
        <div class="space-y-3">
          <!-- Подключиться к комнате -->
          <button
            type="submit"
            :disabled="
              state.isLoading ||
              !form.roomName.trim() ||
              !form.participantName.trim() ||
              state.serverStatus !== 'online'
            "
            class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg
              v-if="state.isLoading"
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ state.isLoading ? "Подключение..." : "Подключиться к комнате" }}
          </button>

          <!-- Создать случайную комнату -->
          <button
            type="button"
            @click="createRoom"
            :disabled="
              state.isLoading ||
              !form.participantName.trim() ||
              state.serverStatus !== 'online'
            "
            class="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Создать случайную комнату
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
