<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
  Participant,
  TrackPublication,
  ConnectionError,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from "livekit-client";
import { LIVEKIT_CONFIG } from "../config/livekit";

interface Props {
  roomName: string;
  participantName: string;
  token: string;
}

const props = defineProps<Props>();
const router = useRouter();

const room = ref<Room>();
const localVideoRef = ref<HTMLVideoElement>();

const state = reactive({
  isConnected: false,
  isConnecting: true,
  isCameraEnabled: true,
  isMicEnabled: true,
  participants: [] as RemoteParticipant[],
  error: "",
  connectionAttempts: 0,
  maxAttempts: 3,
  speakingParticipants: new Set<string>(),
  isLocalSpeaking: false,
  showInviteModal: false,
  inviteLink: "",
  linkCopied: false,
});

// Генерация ссылки приглашения
const generateInviteLink = () => {
  const baseUrl = window.location.origin;
  state.inviteLink = `${baseUrl}/room/${encodeURIComponent(props.roomName)}`;
};

// Копирование ссылки
const copyInviteLink = async () => {
  try {
    await navigator.clipboard.writeText(state.inviteLink);
    state.linkCopied = true;
    setTimeout(() => {
      state.linkCopied = false;
    }, 2000);
  } catch (err) {
    console.error("Не удалось скопировать ссылку:", err);
  }
};

// Показать модальное окно приглашения
const showInviteModal = () => {
  generateInviteLink();
  state.showInviteModal = true;
};

// Закрыть модальное окно
const closeInviteModal = () => {
  state.showInviteModal = false;
  state.linkCopied = false;
};

// Динамическая сетка
const gridClasses = computed(() => {
  const totalParticipants = state.participants.length + 1;

  if (totalParticipants === 1)
    return "grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[60vh]";
  if (totalParticipants === 2)
    return "grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[60vh]";
  if (totalParticipants <= 4)
    return "grid grid-cols-2 md:grid-cols-2 gap-6 h-full min-h-[60vh]";
  if (totalParticipants <= 6)
    return "grid grid-cols-2 md:grid-cols-3 gap-6 h-full min-h-[60vh]";
  return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 h-full min-h-[60vh]";
});

// Подключение к комнате
const connectToRoom = async () => {
  state.connectionAttempts++;

  if (room.value) {
    console.log("🚪 Отключаем предыдущее подключение...");
    await room.value.disconnect();
    room.value = undefined;
  }

  try {
    room.value = new Room({
      autoSubscribe: true,
    });

    // Обработчики событий
    room.value.on(RoomEvent.Connected, handleRoomConnected);
    room.value.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.value.on(
      RoomEvent.ParticipantDisconnected,
      handleParticipantDisconnected
    );
    room.value.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.value.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.value.on(RoomEvent.Disconnected, handleRoomDisconnected);
    room.value.on(
      RoomEvent.ConnectionStateChanged,
      handleConnectionStateChanged
    );
    room.value.on(RoomEvent.Reconnecting, handleReconnecting);
    room.value.on(RoomEvent.Reconnected, handleReconnected);
    room.value.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
    room.value.on(RoomEvent.TrackMuted, handleTrackMuted);
    room.value.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);

    // 🔁 Сначала connect(), потом публикация
    await room.value.connect(LIVEKIT_CONFIG.WS_URL, props.token);
    console.log("✅ Подключение установлено");

    // Теперь публикуем
    try {
      const videoTrack = await createLocalVideoTrack({
        resolution: { width: 1280, height: 720, frameRate: 30 },
      });
      await room.value.localParticipant.publishTrack(videoTrack);
      if (localVideoRef.value) {
        videoTrack.attach(localVideoRef.value);
      }
      state.isCameraEnabled = true;
    } catch (err) {
      console.warn("📹 Не удалось включить камеру:", err);
      state.isCameraEnabled = false;
    }

    try {
      const audioTrack = await createLocalAudioTrack({
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      });
      await room.value.localParticipant.publishTrack(audioTrack);
      state.isMicEnabled = true;
    } catch (err) {
      console.warn("🎤 Не удалось включить микрофон:", err);
      state.isMicEnabled = false;
    }
  } catch (error) {
    console.error("❌ Ошибка подключения:", error);
    let msg = "Не удалось подключиться к комнате";

    if (error instanceof ConnectionError) {
      if (error.message.includes("Failed to fetch")) {
        msg = `Сервер недоступен: ${LIVEKIT_CONFIG.WS_URL}`;
      } else if (error.message.includes("WebSocket")) {
        msg = `Ошибка WebSocket. Проверьте LiveKit сервер.`;
      }
    }

    state.error = msg;
    state.isConnecting = false;

    if (state.connectionAttempts < state.maxAttempts) {
      setTimeout(connectToRoom, 3000);
    }
  }
};

// Обработчики событий
const handleRoomConnected = () => {
  console.log("✅ Успешно подключились");
  state.isConnected = true;
  state.isConnecting = false;
  state.error = "";
  state.participants = Array.from(room.value!.remoteParticipants.values());
};

const handleConnectionStateChanged = (connectionState: any) => {
  console.log("🔄 Состояние подключения:", connectionState);
};

const handleReconnecting = () => {
  console.log("🔄 Переподключение...");
  state.error = "Переподключение...";
};

const handleReconnected = () => {
  console.log("✅ Переподключение успешно");
  state.error = "";
};

const handleParticipantConnected = (participant: RemoteParticipant) => {
  console.log("👤 Подключился:", participant.identity);
  state.participants.push(participant);
};

const handleParticipantDisconnected = (participant: RemoteParticipant) => {
  console.log("👋 Отключился:", participant.identity);
  state.participants = state.participants.filter(
    (p) => p.sid !== participant.sid
  );
  state.speakingParticipants.delete(participant.sid);
};

const handleTrackSubscribed = async (
  track: RemoteTrack,
  publication: TrackPublication,
  participant: RemoteParticipant
) => {
  console.log("📺 Подписан на трек:", track.kind, "от", participant.identity);

  if (track.kind === Track.Kind.Video) {
    await nextTick(); // Дождёмся рендера
    const videoEl = document.querySelector(
      `#participant-${participant.sid} video[autoplay]`
    ) as HTMLVideoElement;

    if (videoEl && !videoEl.srcObject) {
      track.attach(videoEl);
    }
  }
};

const handleTrackUnsubscribed = (track: RemoteTrack) => {
  console.log("📺 Отписка от трека:", track.kind);
  track.detach();
};

const handleRoomDisconnected = () => {
  console.log("🚪 Отключились от комнаты");
  state.isConnected = false;
  router.push("/");
};

const handleActiveSpeakersChanged = (speakers: Participant[]) => {
  state.speakingParticipants.clear();
  state.isLocalSpeaking = false;

  speakers.forEach((sp) => {
    if (sp.sid === room.value?.localParticipant.sid) {
      state.isLocalSpeaking = true;
    } else {
      state.speakingParticipants.add(sp.sid);
    }
  });
};

const handleTrackMuted = (pub: TrackPublication, participant: Participant) => {
  console.log("🔇 Трек заглушен:", pub.kind, participant.identity);
};

const handleTrackUnmuted = (
  pub: TrackPublication,
  participant: Participant
) => {
  console.log("🔊 Трек включен:", pub.kind, participant.identity);
};

// Вспомогательные функции
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const hasVideoTrack = (participant: RemoteParticipant) => {
  return Array.from(participant.videoTrackPublications.values()).some(
    (pub) => !pub.isMuted && pub.track
  );
};

const hasAudioTrack = (participant: RemoteParticipant) => {
  return Array.from(participant.audioTrackPublications.values()).some(
    (pub) => !pub.isMuted && pub.track
  );
};

// Управление
const toggleCamera = async () => {
  const participant = room.value?.localParticipant;
  if (!participant) return;

  const videoPubs = [...participant.videoTrackPublications.values()];
  const pub = videoPubs.find((p) => p.track?.mediaStreamTrack.kind === "video");

  if (!pub) return;

  if (state.isCameraEnabled) {
    await pub.mute();
    state.isCameraEnabled = false;
  } else {
    await pub.unmute();
    state.isCameraEnabled = true;
  }
};

const toggleMicrophone = async () => {
  const participant = room.value?.localParticipant;
  if (!participant) return;

  const audioPubs = [...participant.audioTrackPublications.values()];
  const pub = audioPubs.find((p) => p.track?.mediaStreamTrack.kind === "audio");

  if (!pub) return;

  if (state.isMicEnabled) {
    await pub.mute();
    state.isMicEnabled = false;
  } else {
    await pub.unmute();
    state.isMicEnabled = true;
  }
};

const leaveRoom = async () => {
  console.log("🚪 Выход из комнаты...");
  if (room.value) {
    room.value.localParticipant.videoTrackPublications.forEach((p) =>
      p.track?.stop()
    );
    room.value.localParticipant.audioTrackPublications.forEach((p) =>
      p.track?.stop()
    );
    await room.value.disconnect();
  }
  router.push("/");
};

onMounted(() => connectToRoom());

onUnmounted(() => {
  if (room.value) {
    room.value.localParticipant.videoTrackPublications.forEach((p) =>
      p.track?.stop()
    );
    room.value.localParticipant.audioTrackPublications.forEach((p) =>
      p.track?.stop()
    );
    room.value.disconnect();
  }
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
  >
    <!-- Заголовок -->
    <div
      class="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div
            class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"
          >
            <svg
              class="w-6 h-6 text-white"
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
          <div>
            <h1 class="text-xl font-bold">{{ roomName }}</h1>
            <p class="text-sm text-gray-300">{{ participantName }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <!-- Кнопка приглашения -->
          <button
            @click="showInviteModal"
            class="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>Пригласить</span>
          </button>

          <!-- Статус подключения -->
          <div
            class="flex items-center space-x-2 text-sm text-gray-300 bg-gray-700/50 px-3 py-2 rounded-lg"
          >
            <div
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-yellow-400 animate-pulse': state.isConnecting,
                'bg-green-400': state.isConnected,
                'bg-red-400': !state.isConnected && !state.isConnecting,
              }"
            ></div>
            <span v-if="state.isConnecting">Подключение...</span>
            <span v-else-if="state.isConnected">Подключено</span>
            <span v-else>Отключено</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ошибка -->
    <div
      v-if="state.error"
      class="bg-red-600/90 backdrop-blur-sm text-white px-6 py-4 border-b border-red-500/50"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg
            class="w-5 h-5 mr-3 text-red-200"
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
          {{ state.error }}
        </div>
        <button
          @click="connectToRoom()"
          class="ml-4 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg text-sm font-medium"
        >
          Повторить
        </button>
      </div>
    </div>

    <!-- Загрузка -->
    <div
      v-if="state.isConnecting"
      class="flex-1 flex items-center justify-center min-h-[70vh]"
    >
      <div class="text-center">
        <svg
          class="animate-spin h-16 w-16 text-blue-500 mx-auto mb-6"
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
        <p class="text-xl font-semibold mb-2">Подключение...</p>
        <p class="text-sm text-gray-400">
          Попытка {{ state.connectionAttempts }} из {{ state.maxAttempts }}
        </p>
      </div>
    </div>

    <!-- Видео-сетка -->
    <div v-else-if="state.isConnected" class="flex-1 p-6 pb-32">
      <div :class="gridClasses">
        <!-- Локальное видео -->
        <div
          class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video shadow-xl"
          :class="{
            'ring-4 ring-green-400 ring-opacity-75': state.isLocalSpeaking,
            'ring-2 ring-gray-600': !state.isLocalSpeaking,
          }"
        >
          <video
            ref="localVideoRef"
            v-show="state.isCameraEnabled"
            autoplay
            muted
            playsinline
            class="w-full h-full object-cover"
          ></video>

          <div
            v-if="!state.isCameraEnabled"
            class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700"
          >
            <div class="text-white text-3xl font-bold">
              {{ getInitials(participantName) }}
            </div>
          </div>

          <!-- Индикаторы -->
          <div class="absolute top-3 right-3 flex space-x-2">
            <!-- Микрофон -->
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
              :class="state.isMicEnabled ? 'bg-green-500' : 'bg-red-500'"
            >
              <svg
                class="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  v-if="state.isMicEnabled"
                  fill-rule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clip-rule="evenodd"
                />
                <path
                  v-else
                  fill-rule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>

            <!-- Камера выключена -->
            <div
              v-if="!state.isCameraEnabled"
              class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 15 15">
                <path
                  d="m6.5 0c-.265625 0-.519531.105469-.707031.292969L4.085938 2.000000H3.0625l-1.53125-1.53125L.46875.53125l14 14 1.0625-1.0625-.386719-.386719c.527344-.539062.855469-1.277343.855469-2.082031v-7c0-1.644531-1.355469-3-3-3h-1.085938l-1.707031-1.707031c-.1875-.1875-.441406-.292969-.707031-.292969zm.414062 2h2.171876l1.707031 1.707031c.1875.1875.441406.292969.707031.292969h1.5c.570312 0 1 .429688 1 1v7c0 .269531-.097656.503906-.257812.679688l-2.4375-2.4375c.4375-.640626.695312-1.414063.695312-2.242188 0-2.199219-1.800781-4-4-4-.828125 0-1.601562.257812-2.242188.695312l-.808593-.808593c.09375-.046875.183593-.105469.257812-.179688zm-6.492187 1.484375c-.265625.445313-.421875.964844-.421875 1.515625v7c0 1.644531 1.355469 3 3 3h8.9375l-2-2h-6.9375c-.570312 0-1-.429688-1-1v-6.9375zm7.578125 2.515625c1.117188 0 2 .882812 2 2 0 .277344-.058594.539062-.15625.78125l-2.625-2.625c.242188-.097656.503906-.15625.78125-.15625zm-3.90625 1.15625c-.058594.273438-.09375.554688-.09375.84375 0 2.199219 1.800781 4 4 4 .289062 0 .570312-.035156.84375-.09375z"
                />
              </svg>
            </div>
          </div>

          <div
            class="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm"
          >
            Вы ({{ participantName }})
          </div>
        </div>

        <!-- Удалённые участники -->
        <template
          v-for="participant in state.participants"
          :key="participant.sid"
        >
          <div
            :id="`participant-${participant.sid}`"
            class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video ring-2 transition-all duration-300"
            :class="{
              'ring-green-400 ring-opacity-75': state.speakingParticipants.has(
                participant.sid
              ),
              'ring-gray-600': !state.speakingParticipants.has(participant.sid),
            }"
          >
            <video
              v-for="pub in Array.from(
                participant.videoTrackPublications.values()
              )"
              v-show="!pub.isMuted"
              :key="pub.trackSid"
              autoplay
              playsinline
              class="w-full h-full object-cover"
            ></video>

            <div
              v-if="!hasVideoTrack(participant)"
              class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700"
            >
              <div class="text-white text-2xl font-bold">
                {{ getInitials(participant.name || participant.identity) }}
              </div>
            </div>

            <div
              class="mic-indicator absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
              :class="{
                'bg-green-500': hasAudioTrack(participant),
                'bg-red-500': !hasAudioTrack(participant),
              }"
            >
              <svg
                class="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>

            <div
              class="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm"
            >
              {{ participant.name || participant.identity }}
            </div>
          </div>
        </template>

        <!-- Нет участников -->
        <div
          v-if="state.participants.length === 0"
          class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-xl border-2 border-dashed border-gray-600"
        >
          <div class="text-center">
            <div
              class="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10
                0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0
                015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002
                0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2
                0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p class="text-lg font-semibold text-gray-300 mb-2">
              Ожидание участников...
            </p>
            <p class="text-sm text-gray-500 mb-4">
              Поделитесь ссылкой для присоединения к комнате
            </p>

            <!-- Кнопка приглашения -->
            <button
              @click="showInviteModal"
              class="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Пригласить участников</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Управление -->
    <div
      class="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700/50 px-6 py-6"
    >
      <div class="flex items-center justify-center space-x-6">
        <!-- Микрофон -->
        <button
          @click="toggleMicrophone"
          class="group p-4 rounded-full"
          :class="
            state.isMicEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          "
        >
          <svg
            class="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              v-if="state.isMicEnabled"
              fill-rule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clip-rule="evenodd"
            />
            <path
              v-else
              fill-rule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- Камера -->
        <button
          @click="toggleCamera"
          class="group p-4 rounded-full"
          :class="
            state.isCameraEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          "
        >
          <svg
            class="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              v-if="state.isCameraEnabled"
              d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"
            />
            <path
              v-else
              d="m6.5 0c-.265625 0-.519531.105469-.707031.292969L4.085938 2.000000H3.0625l-1.53125-1.53125L.46875.53125l14 14 1.0625-1.0625-.386719-.386719c.527344-.539062.855469-1.277343.855469-2.082031v-7c0-1.644531-1.355469-3-3-3h-1.085938l-1.707031-1.707031c-.1875-.1875-.441406-.292969-.707031-.292969zm.414062 2h2.171876l1.707031 1.707031c.1875.1875.441406.292969.707031.292969h1.5c.570312 0 1 .429688 1 1v7c0 .269531-.097656.503906-.257812.679688l-2.4375-2.4375c.4375-.640626.695312-1.414063.695312-2.242188 0-2.199219-1.800781-4-4-4-.828125 0-1.601562.257812-2.242188.695312l-.808593-.808593c.09375-.046875.183593-.105469.257812-.179688zm-6.492187 1.484375c-.265625.445313-.421875.964844-.421875 1.515625v7c0 1.644531 1.355469 3 3 3h8.9375l-2-2h-6.9375c-.570312 0-1-.429688-1-1v-6.9375zm7.578125 2.515625c1.117188 0 2 .882812 2 2 0 .277344-.058594.539062-.15625.78125l-2.625-2.625c.242188-.097656.503906-.15625.78125-.15625zm-3.90625 1.15625c-.058594.273438-.09375.554688-.09375.84375 0 2.199219 1.800781 4 4 4 .289062 0 .570312-.035156.84375-.09375z"
            />
          </svg>
        </button>

        <!-- Выход -->
        <button
          @click="leaveRoom"
          class="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white"
        >
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div class="mt-4 text-center">
        <p class="text-sm text-gray-400">
          Участников: {{ state.participants.length + 1 }}
          <span
            v-if="state.speakingParticipants.size > 0 || state.isLocalSpeaking"
            class="ml-2 text-green-400"
          >
            •
            {{
              state.speakingParticipants.size + (state.isLocalSpeaking ? 1 : 0)
            }}
            говорят
          </span>
        </p>
      </div>
    </div>

    <!-- Модальное окно приглашения -->
    <div
      v-if="state.showInviteModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      @click="closeInviteModal"
    >
      <div
        class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        @click.stop
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">
            Пригласить участников
          </h3>
          <button
            @click="closeInviteModal"
            class="text-gray-400 hover:text-white"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p class="text-gray-300 mb-4">
          Поделитесь этой ссылкой с участниками для присоединения к комнате:
        </p>

        <div class="flex items-center space-x-2 mb-4">
          <input
            :value="state.inviteLink"
            readonly
            class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          />
          <button
            @click="copyInviteLink"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            :class="{ 'bg-green-600 hover:bg-green-700': state.linkCopied }"
          >
            {{ state.linkCopied ? "Скопировано!" : "Копировать" }}
          </button>
        </div>

        <div class="text-xs text-gray-400">
          Участники смогут присоединиться к комнате "{{ roomName }}" по этой
          ссылке
        </div>
      </div>
    </div>
  </div>
</template>
