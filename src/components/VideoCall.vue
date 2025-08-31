<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteParticipant,
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

const room = ref<Room | undefined>(undefined);
const localVideoRef = ref<HTMLVideoElement | null>(null);

// Общий reactive state (без participants)
const state = reactive({
  isConnected: false,
  isConnecting: true,
  isCameraEnabled: true,
  isMicEnabled: true,
  error: "" as string,
  connectionAttempts: 0,
  maxAttempts: 3,
  speakingParticipants: new Set<string>(),
  isLocalSpeaking: false,
  showInviteModal: false,
  inviteLink: "" as string,
  linkCopied: false,
});

// ✅ participants — отдельный ref с правильным типом
const participants = ref<RemoteParticipant[]>([]);

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

const showInviteModal = () => {
  generateInviteLink();
  state.showInviteModal = true;
};

const closeInviteModal = () => {
  state.showInviteModal = false;
  state.linkCopied = false;
};

// Динамическая сетка — в script используем participants.value
const gridClasses = computed(() => {
  const totalParticipants = participants.value.length + 1; // +1 локальный
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
    room.value = new Room();

    // Обработчики
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

    // Сначала connect()
    await room.value.connect(LIVEKIT_CONFIG.WS_URL, props.token);
    console.log("✅ Подключение установлено");

    // Публикуем видео
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

    // Публикуем аудио
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
  } catch (error: any) {
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

// Обработчики
const handleRoomConnected = () => {
  console.log("✅ Успешно подключились");
  state.isConnected = true;
  state.isConnecting = false;
  state.error = "";
  participants.value = Array.from(room.value!.remoteParticipants.values());
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
  participants.value.push(participant);
};

const handleParticipantDisconnected = (participant: RemoteParticipant) => {
  console.log("👋 Отключился:", participant.identity);
  participants.value = participants.value.filter(
    (p) => p.sid !== participant.sid
  );
  state.speakingParticipants.delete(participant.sid);
};

const handleTrackSubscribed = async (
  track: RemoteTrack,
  publication: TrackPublication,
  participant: RemoteParticipant
) => {
  console.log(
    "📺 ПОДПИСАЛИСЬ НА ТРЕК:",
    track.kind,
    "от",
    participant.identity
  );

  await nextTick(); // дождаться DOM

  const videoEl = document.querySelector(
    `#participant-${participant.sid} video[autoplay]`
  ) as HTMLVideoElement | null;

  if (videoEl && !videoEl.srcObject) {
    try {
      // track.attach может принимать HTMLVideoElement
      (track as any).attach?.(videoEl);
      console.log("🎥 Прикрепили трек к видео:", videoEl);
    } catch (e) {
      console.warn("Ошибка при attach:", e);
    }
  } else {
    console.warn("⚠️ Не найден video элемент или уже прикреплён");
  }
};

const handleTrackUnsubscribed = (track: RemoteTrack) => {
  console.log("📺 Отписка от трека:", track.kind);
  try {
    (track as any).detach?.();
  } catch (e) {
    // ignore
  }
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

// Вспомогательные
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

const hasVideoTrack = (p: unknown): boolean => {
  const participant = p as RemoteParticipant;
  return Array.from(participant.videoTrackPublications.values()).some(
    (pub: TrackPublication) => pub.track !== undefined && !pub.isMuted
  );
};

const hasAudioTrack = (p: unknown): boolean => {
  const participant = p as RemoteParticipant;
  return Array.from(participant.audioTrackPublications.values()).some(
    (pub: TrackPublication) => pub.track !== undefined && !pub.isMuted
  );
};
// Управление
const toggleCamera = async () => {
  const local = room.value?.localParticipant;
  if (!local) return;

  const videoPubs = [...local.videoTrackPublications.values()];
  const pub = videoPubs.find(
    (p) => (p.track as any)?.mediaStreamTrack?.kind === "video"
  );

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
  const local = room.value?.localParticipant;
  if (!local) return;

  const audioPubs = [...local.audioTrackPublications.values()];
  const pub = audioPubs.find(
    (p) => (p.track as any)?.mediaStreamTrack?.kind === "audio"
  );

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
      (p.track as any)?.stop?.()
    );
    room.value.localParticipant.audioTrackPublications.forEach((p) =>
      (p.track as any)?.stop?.()
    );
    await room.value.disconnect();
  }
  router.push("/");
};

onMounted(() => connectToRoom());

onUnmounted(() => {
  if (room.value) {
    room.value.localParticipant.videoTrackPublications.forEach((p) =>
      (p.track as any)?.stop?.()
    );
    room.value.localParticipant.audioTrackPublications.forEach((p) =>
      (p.track as any)?.stop?.()
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
            <!-- icon -->
          </div>
          <div>
            <h1 class="text-xl font-bold">{{ roomName }}</h1>
            <p class="text-sm text-gray-300">{{ participantName }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="showInviteModal"
            class="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <span>Пригласить</span>
          </button>
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
          :class="
            state.isLocalSpeaking
              ? 'ring-4 ring-green-400 ring-opacity-75'
              : 'ring-2 ring-gray-600'
          "
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

          <div class="absolute top-3 right-3 flex space-x-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
              :class="state.isMicEnabled ? 'bg-green-500' : 'bg-red-500'"
            >
              <!-- mic icon -->
            </div>
            <div
              v-if="!state.isCameraEnabled"
              class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg"
            >
              <!-- camera off icon -->
            </div>
          </div>

          <div
            class="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm"
          >
            Вы ({{ participantName }})
          </div>
        </div>

        <!-- Удалённые участники -->
        <template v-for="participant in participants" :key="participant.sid">
          <div
            :id="`participant-${participant.sid}`"
            class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video ring-2 transition-all duration-300"
            :class="
              state.speakingParticipants.has(participant.sid)
                ? 'ring-green-400 ring-opacity-75'
                : 'ring-gray-600'
            "
          >
            <!-- Видео -->
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

            <!-- Фото с инициалами, если нет видео -->
            <div
              v-if="!hasVideoTrack(participant)"
              class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700"
            >
              <div class="text-white text-2xl font-bold">
                {{ getInitials(participant.name || participant.identity) }}
              </div>
            </div>

            <!-- Индикатор микрофона -->
            <div
              class="mic-indicator absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
              :class="
                hasAudioTrack(participant) ? 'bg-green-500' : 'bg-red-500'
              "
            >
              <!-- mic svg -->
            </div>

            <!-- Имя участника -->
            <div
              class="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm"
            >
              {{ participant.name || participant.identity }}
            </div>
          </div>
        </template>

        <!-- Нет участников -->
        <div
          v-if="participants.length === 0"
          class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-xl border-2 border-dashed border-gray-600"
        >
          <div class="text-center">
            <p class="text-lg font-semibold text-gray-300 mb-2">
              Ожидание участников...
            </p>
            <p class="text-sm text-gray-500 mb-4">
              Поделитесь ссылкой для присоединения к комнате
            </p>
            <button
              @click="showInviteModal"
              class="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
            >
              Пригласить участников
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
        <button
          @click="toggleMicrophone"
          class="group p-4 rounded-full"
          :class="
            state.isMicEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          "
        >
          <!-- mic -->
        </button>

        <button
          @click="toggleCamera"
          class="group p-4 rounded-full"
          :class="
            state.isCameraEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          "
        >
          <!-- camera -->
        </button>

        <button
          @click="leaveRoom"
          class="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white"
        >
          <!-- leave -->
        </button>
      </div>

      <div class="mt-4 text-center">
        <p class="text-sm text-gray-400">
          Участников: {{ participants.length + 1 }}
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

    <!-- Модальное приглашения -->
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
            ✕
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
