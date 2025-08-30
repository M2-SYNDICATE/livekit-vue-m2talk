<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { LiveKitService } from "../services/livekitService";
import { isDevelopment } from "../config/livekit";

interface Props {
  roomId: string;
}

const props = defineProps<Props>();
const router = useRouter();
const route = useRoute();

const form = reactive({
  participantName: "",
});

const state = reactive({
  isLoading: false,
  serverStatus: "checking" as "checking" | "online" | "offline",
  error: "",
  roomName: "",
  linkCopied: false,
});

// Инициализация названия комнаты
const initializeRoomName = () => {
  const roomId = props.roomId || (route.params.roomId as string);
  if (roomId) {
    state.roomName = decodeURIComponent(roomId);
  }
};

// Следим за изменениями параметра роута
watch(
  () => route.params.roomId,
  () => {
    initializeRoomName();
  },
  { immediate: true }
);

// Следим за изменениями props
watch(
  () => props.roomId,
  () => {
    initializeRoomName();
  },
  { immediate: true }
);

const checkServerStatus = async () => {
  state.serverStatus = "checking";
  const isOnline = await LiveKitService.checkServerHealth();
  state.serverStatus = isOnline ? "online" : "offline";
};

const validateForm = () => {
  const usernameValidation = LiveKitService.validateUsername(
    form.participantName
  );
  if (!usernameValidation.isValid) {
    state.error = usernameValidation.error || "Некорректное имя пользователя";
    return false;
  }

  if (!state.roomName) {
    state.error = "Не указано название комнаты";
    return false;
  }

  return true;
};

const joinRoom = async () => {
  state.error = "";

  if (!validateForm()) return;

  state.isLoading = true;

  try {
    const token = await LiveKitService.getAccessToken(
      state.roomName,
      form.participantName.trim()
    );

    console.log("Получен токен, переход к видеозвонку");

    // Переход к видеозвонку через роутер
    await router.push({
      name: "VideoCall",
      query: {
        roomName: state.roomName,
        participantName: form.participantName.trim(),
        token,
      },
    });
  } catch (error) {
    console.error("Ошибка подключения:", error);
    state.error =
      error instanceof Error
        ? error.message
        : "Не удалось подключиться к комнате";
  } finally {
    state.isLoading = false;
  }
};

const copyInviteLink = async () => {
  const link = window.location.href;
  try {
    await navigator.clipboard.writeText(link);
    state.linkCopied = true;
    setTimeout(() => {
      state.linkCopied = false;
    }, 2000);
  } catch (err) {
    console.error("Не удалось скопировать ссылку:", err);
    // Fallback для старых браузеров
    const textArea = document.createElement("textarea");
    textArea.value = link;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      state.linkCopied = true;
      setTimeout(() => {
        state.linkCopied = false;
      }, 2000);
    } catch (fallbackErr) {
      console.error("Fallback копирования также не сработал:", fallbackErr);
    }
    document.body.removeChild(textArea);
  }
};

const goHome = () => {
  router.push("/");
};

onMounted(() => {
  initializeRoomName();
  checkServerStatus();

  if (isDevelopment) {
    console.log("RoomInvite mounted with:", {
      propsRoomId: props.roomId,
      routeRoomId: route.params.roomId,
      finalRoomName: state.roomName,
    });
  }
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
  >
    <div class="max-w-md w-full">
      <!-- Кнопка домой -->
      <button
        @click="goHome"
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
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        На главную
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          Присоединиться к комнате
        </h1>
        <p class="text-gray-600">Вы приглашены в комнату</p>
      </div>

      <!-- Информация о комнате -->
      <div class="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-700">Комната</span>
          <button
            @click="copyInviteLink"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            :class="{ 'text-green-600': state.linkCopied }"
          >
            {{ state.linkCopied ? "Скопировано!" : "Копировать ссылку" }}
          </button>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="font-mono text-lg text-gray-900 break-all">
            {{ state.roomName || "Загрузка..." }}
          </p>
        </div>
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

        <!-- Поле имени -->
        <div class="mb-6">
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
            autofocus
          />
          <p class="mt-1 text-xs text-gray-500">
            От 2 до 30 символов. Разрешены буквы, цифры и пробелы.
          </p>
        </div>

        <!-- Кнопка подключения -->
        <button
          type="submit"
          :disabled="
            state.isLoading ||
            !form.participantName.trim() ||
            state.serverStatus !== 'online' ||
            !state.roomName
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
          {{ state.isLoading ? "Подключение..." : "Присоединиться к комнате" }}
        </button>

        <!-- Дополнительная информация -->
        <div class="mt-4 text-center">
          <p class="text-xs text-gray-500">
            Нажимая "Присоединиться", вы соглашаетесь на использование камеры и
            микрофона
          </p>
        </div>
      </form>

      <!-- Отладочная информация (только в разработке) -->
      <div v-if="isDevelopment" class="mt-4 p-4 bg-gray-100 rounded-lg text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>Props roomId: {{ props.roomId }}</p>
        <p>Route roomId: {{ route.params.roomId }}</p>
        <p>State roomName: {{ state.roomName }}</p>
        <p>Server Status: {{ state.serverStatus }}</p>
      </div>
    </div>
  </div>
</template>
