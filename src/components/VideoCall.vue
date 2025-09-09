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
            <!-- Оставляем SVG иконку как есть -->
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
            <h1 class="text-xl font-bold">{{ props.roomName }}</h1>
            <p class="text-sm text-gray-300">{{ props.participantName }}</p>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Качество соединения -->
          <div
            class="flex items-center space-x-2 text-sm text-gray-300 bg-gray-700/50 px-3 py-2 rounded-lg"
          >
            <div
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-400': state.connectionQuality === 'excellent',
                'bg-yellow-400': state.connectionQuality === 'good',
                'bg-orange-400': state.connectionQuality === 'poor',
                'bg-red-400 animate-pulse': state.connectionQuality === 'lost',
              }"
            ></div>
            <span v-if="state.isConnecting">Подключение...</span>
            <span v-else-if="state.isConnected">
              {{
                state.connectionQuality === "excellent"
                  ? "Отлично"
                  : state.connectionQuality === "good"
                  ? "Хорошо"
                  : state.connectionQuality === "poor"
                  ? "Плохо"
                  : "Потеряно"
              }}
            </span>
            <span v-else>Отключено</span>
          </div>

          <!-- Кнопка настроек устройств -->
          <button
            @click="showDeviceModal"
            class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-lg"
            title="Настройки устройств"
          >
            <Settings />
          </button>

          <!-- Кнопка приглашения -->
          <button
            @click="showInviteModal"
            class="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <plus />
            <span>Пригласить</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Ошибка -->
    <div
      v-if="state.error"
      class="bg-red-600/90 backdrop-blur-sm text-white px-6 py-4 border-b border-red-500/50"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <message-circle-warning />
          <span>{{ state.error }}</span>
        </div>
        <button
          @click="state.error = ''"
          class="ml-4 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg text-sm font-medium transition-colors"
        >
          ✅ Понятно
        </button>
      </div>
    </div>

    <!-- Загрузка -->
    <div
      v-if="state.isConnecting"
      class="flex-1 flex items-center justify-center min-h-[70vh]"
    >
      <div class="text-center">
        <div
          class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        ></div>
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
          class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video shadow-xl transition-all duration-300"
          :class="
            localAudioLevel.speaking
              ? 'ring-4 ring-green-400 ring-opacity-75'
              : 'ring-2 ring-gray-600'
          "
        >
          <!-- Видео (показывается автоматически когда камера включена) -->
          <video
            ref="localVideoRef"
            v-show="state.isCameraEnabled && state.videoVisible"
            autoplay
            muted
            playsinline
            class="w-full h-full object-cover"
          ></video>

          <!-- Аватар при отключенной камере -->
          <div
            v-if="!state.isCameraEnabled || !state.videoVisible"
            class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700"
          >
            <div class="text-white text-3xl font-bold">
              {{ getInitials(props.participantName) }}
            </div>
          </div>

          <!-- Индикаторы -->
          <div class="absolute top-3 right-3 flex space-x-2">
            <!-- Индикатор микрофона -->
            <div class="relative">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors"
                :class="state.isMicEnabled ? 'bg-green-500' : 'bg-red-500'"
              >
                <Mic v-if="state.isMicEnabled" class="w-4 h-4 text-white" />
                <MicOff v-else class="w-4 h-4 text-white" />
              </div>
              <!-- Индикатор уровня звука -->
              <div
                v-if="state.isMicEnabled && localAudioLevel.level > 0"
                class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"
                :style="{ opacity: localAudioLevel.level }"
              ></div>
            </div>

            <!-- Индикатор камеры -->
            <div
              v-if="!state.isCameraEnabled"
              class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg text-lg"
            >
              <camera />
            </div>
          </div>

          <!-- Имя участника -->
          <div
            class="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm"
          >
            Вы ({{ props.participantName }})
          </div>

          <!-- Индикатор качества -->
          <div class="absolute top-3 left-3">
            <div
              class="flex items-center space-x-1 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-sm"
            >
              <div
                class="w-2 h-2 rounded-full"
                :class="{
                  'bg-green-400': state.connectionQuality === 'excellent',
                  'bg-yellow-400': state.connectionQuality === 'good',
                  'bg-orange-400': state.connectionQuality === 'poor',
                  'bg-red-400': state.connectionQuality === 'lost',
                }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Удалённые участники -->
        <template v-for="participant in participants" :key="participant.sid">
          <div
            :id="`participant-${participant.sid}`"
            class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video shadow-xl transition-all duration-300"
            :class="
              getAudioLevel(participant.sid).speaking
                ? 'ring-4 ring-green-400 ring-opacity-75'
                : 'ring-2 ring-gray-600'
            "
          >
            <!-- Видео (показывается автоматически) -->
            <video
              v-show="
                hasVideoTrack(participant) &&
                getParticipantVideoVisibility(participant.sid)
              "
              data-track="video"
              autoplay
              playsinline
              class="w-full h-full object-cover"
            ></video>

            <!-- Скрытый аудио элемент -->
            <audio autoplay></audio>

            <!-- Бот Настя HR (bot) - Изображение -->
            <div
              v-if="
                participant.name === 'Настя HR (bot)' ||
                participant.identity === 'Настя HR (bot)'
              "
              class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700"
            >
              <img
                :src="'/nastya-hr-avatar.webp'"
                alt="Бот Настя HR"
                class="w-full h-full object-cover rounded-lg"
              />
            </div>

            <!-- Остальные аватары (для обычных участников) -->
            <div
              v-else-if="
                !hasVideoTrack(participant) ||
                !getParticipantVideoVisibility(participant.sid)
              "
              class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700"
            >
              <div class="text-white text-2xl font-bold">
                {{ getInitials(participant.name || participant.identity) }}
              </div>
            </div>

            <!-- Индикаторы -->
            <div class="absolute top-3 right-3 flex space-x-2">
              <!-- Индикатор микрофона -->
              <div class="relative">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors"
                  :class="
                    hasAudioTrack(participant) ? 'bg-green-500' : 'bg-red-500'
                  "
                >
                  <Mic
                    v-if="hasAudioTrack(participant)"
                    class="w-4 h-4 text-white"
                  />
                  <MicOff v-else class="w-4 h-4 text-white" />
                </div>
                <!-- Индикатор уровня звука -->
                <div
                  v-if="
                    hasAudioTrack(participant) &&
                    getAudioLevel(participant.sid).level > 0
                  "
                  class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"
                  :style="{ opacity: getAudioLevel(participant.sid).level }"
                ></div>
              </div>

              <!-- Индикатор камеры -->
              <div
                v-if="!hasVideoTrack(participant)"
                class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg text-lg"
              >
                <Camera />
              </div>
            </div>

            <!-- Имя участника -->
            <div
              class="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm"
            >
              {{ participant.name || participant.identity }}
            </div>

            <!-- Регулятор громкости -->
            <div
              v-if="hasAudioTrack(participant)"
              class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-2 min-w-[120px]"
            >
              <volume2 />
              <input
                type="range"
                min="0"
                max="100"
                :value="getParticipantVolume(participant.sid)"
                @input="
                  setParticipantVolume(
                    participant.sid,
                    ($event.target as HTMLInputElement).valueAsNumber
                  )
                "
                class="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer volume-slider"
              />
              <span class="text-xs text-white w-8 text-right">
                {{ getParticipantVolume(participant.sid) }}%
              </span>
            </div>
          </div>
        </template>

        <!-- Нет участников -->
        <div
          v-if="participants.length === 0"
          class="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-xl border-2 border-dashed border-gray-600"
        >
          <div class="text-center">
            <div
              class="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            >
              <users />
            </div>
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
              <plus />
              <span>Пригласить участников</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Панель управления -->
    <div
      class="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700/50 px-6 py-6"
    >
      <div class="flex items-center justify-center space-x-6">
        <!-- ДОБАВЛЕНО: Кнопка участников -->
        <button
          @click="toggleParticipantsPanel"
          class="group p-4 rounded-full transition-all duration-200 transform hover:scale-105"
          :class="
            state.showParticipantsPanel
              ? 'bg-blue-600'
              : 'bg-gray-700 hover:bg-gray-600'
          "
          title="Участники"
        >
          <Users class="w-6 h-6 text-white" />
        </button>
        <!-- Микрофон -->
        <div class="relative">
          <button
            @click="toggleMicrophone"
            class="group p-4 rounded-full transition-all duration-200 transform hover:scale-105"
            :class="
              state.isMicEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            "
            :title="
              state.isMicEnabled ? 'Выключить микрофон' : 'Включить микрофон'
            "
          >
            <Mic v-if="state.isMicEnabled" class="w-6 h-6 text-white" />
            <MicOff v-else class="w-6 h-6 text-white" />
          </button>
          <!-- Индикатор уровня звука -->
          <div
            v-if="state.isMicEnabled && localAudioLevel.level > 0"
            class="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-pulse"
            :style="{ opacity: localAudioLevel.level }"
          ></div>
        </div>

        <!-- Камера -->
        <button
          @click="toggleCamera"
          class="group p-4 rounded-full transition-all duration-200 transform hover:scale-105"
          :class="
            state.isCameraEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          "
          :title="
            state.isCameraEnabled ? 'Выключить камеру' : 'Включить камеру'
          "
        >
          <Camera v-if="state.isCameraEnabled" class="w-6 h-6 text-white" />
          <CameraOff v-else class="w-6 h-6 text-white" />
        </button>

        <!-- Настройки устройств -->
        <button
          @click="showDeviceModal"
          class="group p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-200 transform hover:scale-105 text-2xl"
          title="Настройки устройств"
        >
          <settings />
        </button>

        <!-- Выход -->
        <button
          @click="leaveRoom"
          class="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105 text-2xl"
          title="Покинуть комнату"
        >
          <log-out />
        </button>
      </div>

      <!-- Статистика -->
      <div class="mt-4 text-center">
        <p class="text-sm text-gray-400">
          Участников: {{ participants.length + 1 }}
          <span
            v-if="state.speakingParticipants.size > 0 || state.isLocalSpeaking"
            class="ml-2 text-green-400 inline-flex items-center"
          >
            <Megaphone class="w-4 h-4 mr-1" />
            {{
              state.speakingParticipants.size + (state.isLocalSpeaking ? 1 : 0)
            }}
            говорят
          </span>
        </p>
      </div>
    </div>

    <!--Боковая панель участников-->
    <div
      v-if="state.showParticipantsPanel"
      class="fixed top-0 left-0 h-full w-80 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700/50 z-40 transform transition-transform duration-300 ease-in-out"
      :class="
        state.showParticipantsPanel ? 'translate-x-0' : '-translate-x-full'
      "
    >
      <div
        class="p-4 border-b border-gray-700/50 flex items-center justify-between"
      >
        <h3 class="text-lg font-semibold text-white">Участники</h3>
        <button
          @click="toggleParticipantsPanel"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="overflow-y-auto h-[calc(100vh-80px)]">
        <!-- Локальный участник -->
        <div class="p-4 border-b border-gray-700/30">
          <div class="flex items-center space-x-3">
            <div class="relative">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center"
              >
                <span class="text-white text-sm font-bold">{{
                  getInitials(props.participantName)
                }}</span>
              </div>
              <div
                class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800"
                :class="{
                  'bg-green-400': state.connectionQuality === 'excellent',
                  'bg-yellow-400': state.connectionQuality === 'good',
                  'bg-orange-400': state.connectionQuality === 'poor',
                  'bg-red-400': state.connectionQuality === 'lost',
                }"
              ></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm font-medium truncate">
                Вы ({{ props.participantName }})
              </p>
              <p class="text-xs text-gray-400 capitalize">
                {{
                  state.connectionQuality === "excellent"
                    ? "Отлично"
                    : state.connectionQuality === "good"
                    ? "Хорошо"
                    : state.connectionQuality === "poor"
                    ? "Плохо"
                    : "Потеряно"
                }}
              </p>
            </div>
            <div class="flex items-center">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center"
                :class="state.isMicEnabled ? 'bg-green-500' : 'bg-red-500'"
              >
                <Mic v-if="state.isMicEnabled" class="w-3 h-3 text-white" />
                <MicOff v-else class="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>
        <!-- Удаленные участники -->
        <div
          v-for="participant in participants"
          :key="participant.sid"
          class="p-4 border-b border-gray-700/30"
        >
          <div class="flex items-center space-x-3">
            <div class="relative">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center"
              >
                <span class="text-white text-sm font-bold">{{
                  getInitials(participant.name || participant.identity)
                }}</span>
              </div>
              <!-- Здесь можно добавить индикатор качества для удаленных участников, если доступен -->
              <!-- Пока показываем общий индикатор активности -->
              <div
                v-if="state.speakingParticipants.has(participant.sid)"
                class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 bg-green-400 animate-pulse"
              ></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm font-medium truncate">
                {{ participant.name || participant.identity }}
              </p>
              <p class="text-xs text-gray-400">
                {{ hasAudioTrack(participant) ? "Аудио" : "Нет аудио" }}
                {{ hasVideoTrack(participant) ? ", Видео" : ", Нет видео" }}
              </p>
            </div>
            <div class="flex items-center space-x-1">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center"
                :class="
                  hasAudioTrack(participant) ? 'bg-green-500' : 'bg-red-500'
                "
              >
                <Mic
                  v-if="hasAudioTrack(participant)"
                  class="w-3 h-3 text-white"
                />
                <MicOff v-else class="w-3 h-3 text-white" />
              </div>
              <div
                v-if="!hasVideoTrack(participant)"
                class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
              >
                <CameraOff class="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>

        <!-- Нет участников -->
        <div v-if="participants.length === 0" class="p-4 text-center">
          <p class="text-gray-400 text-sm">В комнате нет других участников</p>
        </div>
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
            class="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ❌
          </button>
        </div>

        <p class="text-gray-300 mb-4">
          Поделитесь этой ссылкой с участниками для присоединения к комнате:
        </p>

        <div class="flex items-center space-x-2 mb-4">
          <input
            :value="state.inviteLink"
            readonly
            class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            @click="copyInviteLink"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
            :class="{ 'bg-green-600 hover:bg-green-700': state.linkCopied }"
          >
            <ClipboardCheck v-if="state.linkCopied" class="w-4 h-4 mr-2" />
            <Clipboard v-else class="w-4 h-4 mr-2" />
            {{ state.linkCopied ? "Скопировано!" : "Копировать" }}
          </button>
        </div>

        <div class="text-xs text-gray-400">
          Участники смогут присоединиться к комнате "{{ props.roomName }}" по
          этой ссылке
        </div>
      </div>
    </div>

    <!-- Модальное окно настроек устройств -->
    <div
      v-if="state.showDeviceModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      @click="closeDeviceModal"
    >
      <div
        class="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">Настройки устройств</h3>
          <button
            @click="closeDeviceModal"
            class="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ❌
          </button>
        </div>

        <!-- Камеры -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            <Camera class="w-5 h-5 mr-2 inline-block" />
            Камера
          </label>
          <select
            v-model="deviceState.selectedCamera"
            @change="switchCamera(deviceState.selectedCamera)"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option
              v-for="camera in deviceState.cameras"
              :key="camera.deviceId"
              :value="camera.deviceId"
            >
              {{ camera.label }}
            </option>
          </select>
        </div>

        <!-- Микрофоны -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            <Mic class="w-5 h-5 mr-2 inline-block" />
            Микрофон
          </label>
          <select
            v-model="deviceState.selectedMicrophone"
            @change="switchMicrophone(deviceState.selectedMicrophone)"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option
              v-for="mic in deviceState.microphones"
              :key="mic.deviceId"
              :value="mic.deviceId"
            >
              {{ mic.label }}
            </option>
          </select>

          <!-- Тест микрофона -->
          <div class="mt-3 p-3 bg-gray-700/50 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-300">Уровень звука</span>
              <span class="text-xs text-gray-400"
                >{{ Math.round(localAudioLevel.level * 100) }}%</span
              >
            </div>
            <div class="w-full bg-gray-600 rounded-full h-2">
              <div
                class="bg-green-400 h-2 rounded-full transition-all duration-100"
                :style="{ width: `${localAudioLevel.level * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Динамики -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            <Volume2 class="w-5 h-5 mr-2 inline-block" />
            Динамики
          </label>
          <select
            v-model="deviceState.selectedSpeaker"
            @change="switchSpeaker(deviceState.selectedSpeaker)"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option
              v-for="speaker in deviceState.speakers"
              :key="speaker.deviceId"
              :value="speaker.deviceId"
            >
              {{ speaker.label }}
            </option>
          </select>

          <!-- Тест динамиков -->
          <button
            @click="testSpeakers"
            class="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
            :disabled="deviceState.testingAudio"
          >
            <Volume2 v-if="!deviceState.testingAudio" class="w-4 h-4 mr-2" />
            <Loader
              v-if="deviceState.testingAudio"
              class="w-4 h-4 mr-2 animate-spin"
            />
            {{ deviceState.testingAudio ? "Тестирование..." : "Тест звука" }}
          </button>
        </div>

        <!-- Настройки качества -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            <Columns3Cog class="w-5 h-5 mr-2 inline-block" />
            Качество видео
          </label>
          <select
            v-model="deviceState.videoQuality"
            @change="changeVideoQuality(deviceState.videoQuality)"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="low">Низкое (480p)</option>
            <option value="medium">Среднее (720p)</option>
            <option value="high">Высокое (1080p)</option>
          </select>
        </div>

        <!-- Дополнительные настройки -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300 flex items-center">
              <Ear class="w-4 h-4 mr-2" />
              Подавление шума
            </label>
            <button
              @click="
                deviceState.noiseSuppression = !deviceState.noiseSuppression;
                updateAudioSettings();
              "
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="
                deviceState.noiseSuppression ? 'bg-blue-600' : 'bg-gray-600'
              "
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="
                  deviceState.noiseSuppression
                    ? 'translate-x-6'
                    : 'translate-x-1'
                "
              ></span>
            </button>
          </div>

          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300 flex items-center">
              <RefreshCw class="w-4 h-4 mr-2" />
              Подавление эха
            </label>
            <button
              @click="
                deviceState.echoCancellation = !deviceState.echoCancellation;
                updateAudioSettings();
              "
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="
                deviceState.echoCancellation ? 'bg-blue-600' : 'bg-gray-600'
              "
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="
                  deviceState.echoCancellation
                    ? 'translate-x-6'
                    : 'translate-x-1'
                "
              ></span>
            </button>
          </div>

          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300 flex items-center">
              <AudioWaveform class="w-4 h-4 mr-2" />
              Автоматическая регулировка громкости
            </label>
            <button
              @click="
                deviceState.autoGainControl = !deviceState.autoGainControl;
                updateAudioSettings();
              "
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="
                deviceState.autoGainControl ? 'bg-blue-600' : 'bg-gray-600'
              "
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="
                  deviceState.autoGainControl
                    ? 'translate-x-6'
                    : 'translate-x-1'
                "
              ></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

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
  ConnectionQuality,
  LocalVideoTrack,
  LocalAudioTrack,
} from "livekit-client";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  LogOut,
  Settings,
  Plus,
  Clipboard,
  ClipboardCheck,
  Users,
  Megaphone,
  SlidersVertical,
  Volume2,
  VolumeOff,
  RefreshCw,
  AudioWaveform,
  X,
  SettingsIcon,
  MessageCircleWarning,
  CircleCheck,
  Loader,
  Columns3Cog,
  Ear,
} from "lucide-vue-next";
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

// Основное состояние
const state = reactive({
  isConnected: false,
  isConnecting: true,
  isCameraEnabled: false, // Камера выключена по умолчанию
  isMicEnabled: true,
  error: "" as string,
  connectionAttempts: 0,
  maxAttempts: 3,
  speakingParticipants: new Set<string>(),
  isLocalSpeaking: false,
  showInviteModal: false,
  showDeviceModal: false,
  inviteLink: "" as string,
  linkCopied: false,
  connectionQuality: "good" as "excellent" | "good" | "poor" | "lost",
  videoVisible: false, // Локальное видео скрыто по умолчанию
  cameraPermissionDenied: false, // Флаг для отслеживания отказа в доступе к камере
  microphonePermissionDenied: false, // Флаг для отслеживания отказа в доступе к микрофону
  showParticipantsPanel: false,
});

// Состояние устройств
const deviceState = reactive({
  cameras: [] as MediaDeviceInfo[],
  microphones: [] as MediaDeviceInfo[],
  speakers: [] as MediaDeviceInfo[],
  selectedCamera: "",
  selectedMicrophone: "",
  selectedSpeaker: "",
  videoQuality: "medium" as "low" | "medium" | "high",
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  testingAudio: false,
});

// Аудио уровни
const localAudioLevel = ref({ level: 0, speaking: false });
const participantAudioLevels = ref<
  Map<string, { level: number; speaking: boolean }>
>(new Map());

// Видимость видео участников
const participantVideoVisibility = ref<Map<string, boolean>>(new Map());

// Громкость участников
const participantVolumes = ref<Map<string, number>>(new Map());

// Участники
interface MinimalParticipant {
  sid: string;
  identity: string;
  name?: string;
  videoTrackPublications: Map<
    string,
    { track?: { kind: string }; isMuted: boolean }
  >;
  audioTrackPublications: Map<
    string,
    { track?: { kind: string }; isMuted: boolean }
  >;
}

const toggleParticipantsPanel = () => {
  state.showParticipantsPanel = !state.showParticipantsPanel;
};

const participants = ref<MinimalParticipant[]>([]);

// Локальные треки
let localVideoTrack: LocalVideoTrack | undefined;
let localAudioTrack: LocalAudioTrack | undefined;

// Получение видимости видео участника
const getParticipantVideoVisibility = (participantSid: string) => {
  return participantVideoVisibility.value.get(participantSid) || false;
};

// Получение громкости участника
const getParticipantVolume = (participantSid: string) => {
  return participantVolumes.value.get(participantSid) ?? 100;
};

// Установка громкости участника
const setParticipantVolume = (
  participantSid: string,
  volume: string | number
) => {
  // Если volume - строка, парсим, иначе используем как есть
  const volumeValue =
    typeof volume === "string" ? parseInt(volume, 10) : volume;

  // Убеждаемся, что значение в допустимом диапазоне
  const clampedVolume = Math.max(0, Math.min(100, volumeValue));

  participantVolumes.value.set(participantSid, clampedVolume);

  // Применяем громкость к аудио элементу
  const participantEl = document.querySelector(
    `#participant-${participantSid}`
  );
  if (participantEl) {
    const audioEl = participantEl.querySelector("audio") as HTMLAudioElement;
    if (audioEl) {
      audioEl.volume = clampedVolume / 100;
    }
  }
};

// Получение аудио уровня участника
const getAudioLevel = (participantSid: string) => {
  return (
    participantAudioLevels.value.get(participantSid) || {
      level: 0,
      speaking: false,
    }
  );
};

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

// Модальные окна
const showInviteModal = () => {
  generateInviteLink();
  state.showInviteModal = true;
};

const closeInviteModal = () => {
  state.showInviteModal = false;
  state.linkCopied = false;
};

const showDeviceModal = async () => {
  await loadDevices();
  state.showDeviceModal = true;
};

const closeDeviceModal = () => {
  state.showDeviceModal = false;
};

// Загрузка устройств
const loadDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    deviceState.cameras = devices.filter((d) => d.kind === "videoinput");
    deviceState.microphones = devices.filter((d) => d.kind === "audioinput");
    deviceState.speakers = devices.filter((d) => d.kind === "audiooutput");

    // Установка текущих устройств
    if (localVideoTrack) {
      const videoSettings = localVideoTrack.mediaStreamTrack?.getSettings();
      if (videoSettings?.deviceId) {
        deviceState.selectedCamera = videoSettings.deviceId;
      }
    }

    if (localAudioTrack) {
      const audioSettings = localAudioTrack.mediaStreamTrack?.getSettings();
      if (audioSettings?.deviceId) {
        deviceState.selectedMicrophone = audioSettings.deviceId;
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки устройств:", error);
  }
};

// Переключение камеры
const switchCamera = async (deviceId: string) => {
  if (!room.value) return;

  try {
    // Остановка старого трека
    if (localVideoTrack) {
      localVideoTrack.stop();
    }

    // Создание нового трека
    localVideoTrack = await createLocalVideoTrack({
      deviceId,
      ...getVideoResolution(),
    });

    // Публикация нового трека
    await room.value.localParticipant.publishTrack(localVideoTrack, {
      name: "camera",
    });

    // Автоматически показываем видео если камера включена
    if (state.isCameraEnabled && localVideoRef.value) {
      localVideoTrack.attach(localVideoRef.value);
      state.videoVisible = true;
    }

    deviceState.selectedCamera = deviceId;
    console.log("✅ Камера переключена на:", deviceId);
  } catch (error) {
    console.error("❌ Ошибка переключения камеры:", error);
    state.error = "Не удалось переключить камеру";
  }
};

// Переключение микрофона
const switchMicrophone = async (deviceId: string) => {
  if (!room.value) return;

  try {
    // Остановка старого трека
    if (localAudioTrack) {
      localAudioTrack.stop();
    }

    // Создание нового трека
    localAudioTrack = await createLocalAudioTrack({
      deviceId,
      autoGainControl: deviceState.autoGainControl,
      echoCancellation: deviceState.echoCancellation,
      noiseSuppression: deviceState.noiseSuppression,
    });

    // Публикация нового трека
    await room.value.localParticipant.publishTrack(localAudioTrack, {
      name: "microphone",
    });

    deviceState.selectedMicrophone = deviceId;

    // Перезапуск мониторинга аудио
    startAudioLevelMonitoring();

    console.log("✅ Микрофон переключен на:", deviceId);
  } catch (error) {
    console.error("❌ Ошибка переключен��я микрофона:", error);
    state.error = "Не удалось переключить микрофон";
  }
};

// Переключение динамиков
const switchSpeaker = async (deviceId: string) => {
  deviceState.selectedSpeaker = deviceId;

  // Применяем к существующим аудио элементам
  const audioElements = document.querySelectorAll("audio");
  for (const audio of audioElements) {
    try {
      if ("setSinkId" in audio) {
        await (audio as any).setSinkId(deviceId);
      }
    } catch (error) {
      console.error("Ошибка переключения динамиков:", error);
    }
  }

  console.log("✅ Динамики переключены на:", deviceId);
};

// Тест динамиков
const testSpeakers = async () => {
  deviceState.testingAudio = true;

  try {
    // Создаем короткий тестовый звук
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);

    setTimeout(() => {
      deviceState.testingAudio = false;
      audioContext.close();
    }, 600);
  } catch (error) {
    console.error("Ошибка тестирования звука:", error);
    deviceState.testingAudio = false;
  }
};

// Получение разрешения видео
const getVideoResolution = () => {
  switch (deviceState.videoQuality) {
    case "low":
      return { width: 640, height: 480, frameRate: 15 };
    case "medium":
      return { width: 1280, height: 720, frameRate: 30 };
    case "high":
      return { width: 1920, height: 1080, frameRate: 30 };
    default:
      return { width: 1280, height: 720, frameRate: 30 };
  }
};

// Изменение качества видео
const changeVideoQuality = async (quality: string) => {
  deviceState.videoQuality = quality as "low" | "medium" | "high";

  if (deviceState.selectedCamera && state.isCameraEnabled) {
    await switchCamera(deviceState.selectedCamera);
  }
};

// Обновление настроек аудио
const updateAudioSettings = async () => {
  if (deviceState.selectedMicrophone && state.isMicEnabled) {
    await switchMicrophone(deviceState.selectedMicrophone);
  }
};

// Динамическая сетка
const gridClasses = computed(() => {
  const totalParticipants = participants.value.length + 1;
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

// Мониторинг аудио уровней
const startAudioLevelMonitoring = () => {
  if (!localAudioTrack) return;

  try {
    // Создаем анализатор для локального аудио
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(
      new MediaStream([localAudioTrack.mediaStreamTrack])
    );
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!localAudioTrack || localAudioTrack.isMuted) {
        localAudioLevel.value = { level: 0, speaking: false };
        requestAnimationFrame(updateLevel);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const level = Math.min(average / 128, 1);

      localAudioLevel.value = {
        level,
        speaking: level > 0.1,
      };

      requestAnimationFrame(updateLevel);
    };

    updateLevel();
  } catch (error) {
    console.error("Ошибка мониторинга аудио:", error);
  }
};

// Подключение к комнате
const connectToRoom = async () => {
  state.connectionAttempts++;
  state.error = "";

  if (room.value) {
    console.log("🚪 Отключаем предыдущее подключение...");
    await room.value.disconnect();
    room.value = undefined;
  }

  try {
    room.value = new Room();

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
    room.value.on(
      RoomEvent.ConnectionQualityChanged,
      handleConnectionQualityChanged
    );

    // Подключение
    await room.value.connect(LIVEKIT_CONFIG.WS_URL, props.token);
    console.log("✅ Подключение установлено");

    // Публикация аудио
    try {
      localAudioTrack = await createLocalAudioTrack({
        autoGainControl: deviceState.autoGainControl,
        echoCancellation: deviceState.echoCancellation,
        noiseSuppression: deviceState.noiseSuppression,
      });
      await room.value.localParticipant.publishTrack(localAudioTrack);
      state.isMicEnabled = true;

      // Запуск мониторинга аудио
      startAudioLevelMonitoring();
    } catch (err) {
      console.warn("🎤 Не удалось включить микрофон при подключении:", err);
      state.isMicEnabled = false;
      let errorMsg = "Не удалось включить микрофон при подключении."; // Сообщение по умолчанию
      let isPermissionDenied = false; // Флаг для определения ошибки доступа

      // Безопасно проверяем свойства err
      if (err && typeof err === "object") {
        // Проверка по имени ошибки
        if (
          (err as any).name === "NotAllowedError" ||
          (err as any).name === "PermissionDeniedError"
        ) {
          isPermissionDenied = true;
        }
        // Проверка по сообщению ошибки
        if ((err as any).message && typeof (err as any).message === "string") {
          const msg = (err as any).message.toLowerCase();
          if (
            msg.includes("denied") ||
            msg.includes("permission") || // Проверяем в нижнем регистре
            msg.includes("разрешен") || // Оригинальная проверка
            msg.includes("permission denied by system") || // Оригинальная проверка
            msg.includes("allow") || // Оригинальная проверка
            msg.includes("grant") // Оригинальная проверка
          ) {
            isPermissionDenied = true;
          }
        }
      }

      if (isPermissionDenied) {
        // Устанавливаем флаг, так как ошибка произошла
        state.microphonePermissionDenied = true;
        // Сообщение может быть чуть другим, если это начальное подключение
        errorMsg =
          "Доступ к микрофону запрещен. Вы можете включить микрофон позже в настройках.";
        // Не устанавливаем isMicEnabled в true, оставляем false
      } else {
        // Если это не ошибка доступа, добавляем общую информацию
        errorMsg += " Проверьте подключение микрофона и настройки браузера.";
      }

      // Устанавливаем сообщение об ошибке в состоянии
      state.error = errorMsg;
      // --- КОНЕЦ ДОБАВЛЕНИЯ ---
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

// Обработчики событий
const handleRoomConnected = () => {
  console.log("✅ Успешно подключились");
  participants.value = Array.from(
    room.value!.remoteParticipants.values()
  ) as RemoteParticipant[];
  state.isConnected = true;
  state.isConnecting = false;
  state.error = "";
};

const handleConnectionStateChanged = (connectionState: any) => {
  console.log("🔄 Состояние подключения:", connectionState);
};

const handleConnectionQualityChanged = (
  quality: ConnectionQuality,
  participant: Participant
) => {
  if (participant.sid === room.value?.localParticipant.sid) {
    switch (quality) {
      case ConnectionQuality.Excellent:
        state.connectionQuality = "excellent";
        break;
      case ConnectionQuality.Good:
        state.connectionQuality = "good";
        break;
      case ConnectionQuality.Poor:
        state.connectionQuality = "poor";
        break;
      default:
        state.connectionQuality = "lost";
    }
  }
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
  participants.value.push(participant as RemoteParticipant);

  // Автоматически показываем видео новых участников
  participantVideoVisibility.value.set(participant.sid, true);

  // Устанавливаем громкость по умолчанию
  participantVolumes.value.set(participant.sid, 100);
};

const handleParticipantDisconnected = (participant: RemoteParticipant) => {
  console.log("👋 Отключился:", participant.identity);
  participants.value = participants.value.filter(
    (p) => p.sid !== participant.sid
  );
  state.speakingParticipants.delete(participant.sid);
  participantAudioLevels.value.delete(participant.sid);
  participantVideoVisibility.value.delete(participant.sid);
  participantVolumes.value.delete(participant.sid);
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
  await nextTick();
  const participantEl = document.querySelector(
    `#participant-${participant.sid}`
  );
  if (!participantEl) return;

  if (
    participant.name === "Настя HR (bot)" ||
    participant.identity === "Настя HR (bot)"
  ) {
    const videoEl = participantEl.querySelector(
      'video[data-track="video"]'
    ) as HTMLVideoElement;

    // Если видео элемент существует, скрываем его и показываем изображение
    if (videoEl) {
      videoEl.style.display = "none";
    }

    // Находим или создаем контейнер для изображения
    let imageContainer = participantEl.querySelector(".bot-image-container");
    if (!imageContainer) {
      imageContainer = document.createElement("div");
      imageContainer.className =
        "bot-image-container absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700";
      participantEl.appendChild(imageContainer);
    }

    // Устанавливаем изображение
    const img = imageContainer.querySelector("img") as HTMLImageElement;
    if (img) {
      img.src = "/bot-avatar.png"; // Путь к изображению в public
    } else {
      const newImg = document.createElement("img");
      newImg.src = "/bot-avatar.png";
      newImg.alt = "Бот Настя HR";
      newImg.className = "w-full h-full object-cover rounded-lg";
      imageContainer.appendChild(newImg);
    }

    // Закрепляем трек (если нужно)
    try {
      track.attach(videoEl); // Это может быть не обязательно
    } catch (e) {
      console.warn("Ошибка при attach:", e);
    }

    return; // Прерываем выполнение, так как мы уже обработали бота
  }

  // Остальная логика для обычных участников (оставляем без изменений)
  if (track.kind === "video") {
    const videoEl = participantEl.querySelector(
      'video[data-track="video"]'
    ) as HTMLVideoElement;
    if (videoEl && !videoEl.srcObject) {
      try {
        track.attach(videoEl);
        // Автоматически показываем видео
        participantVideoVisibility.value.set(participant.sid, true);
        console.log("🎥 Прикрепили и показали видео трек");
      } catch (e) {
        console.warn("Ошибка при attach видео:", e);
      }
    }
  } else if (track.kind === "audio") {
    const audioEl = participantEl.querySelector("audio") as HTMLAudioElement;
    if (audioEl) {
      try {
        track.attach(audioEl);
        // Установка динамика
        if (deviceState.selectedSpeaker && "setSinkId" in audioEl) {
          await (audioEl as any).setSinkId(deviceState.selectedSpeaker);
        }
        // Применяем сохраненную громкость
        const volume = getParticipantVolume(participant.sid);
        audioEl.volume = volume / 100;
        console.log("🎵 Прикрепили аудио трек");
      } catch (e) {
        console.warn("Ошибка при attach аудио:", e);
      }
    }
  }
};

const handleTrackUnsubscribed = (track: RemoteTrack) => {
  console.log("📺 Отписка от трека:", track.kind);
  try {
    track.detach();
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

      // Обновляем аудио уровень участника
      const currentLevel = participantAudioLevels.value.get(sp.sid) || {
        level: 0,
        speaking: false,
      };
      participantAudioLevels.value.set(sp.sid, {
        ...currentLevel,
        speaking: true,
      });
    }
  });

  // Сбрасываем speaking для неговорящих участников
  participants.value.forEach((p) => {
    if (!state.speakingParticipants.has(p.sid)) {
      const currentLevel = participantAudioLevels.value.get(p.sid) || {
        level: 0,
        speaking: false,
      };
      participantAudioLevels.value.set(p.sid, {
        ...currentLevel,
        speaking: false,
      });
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
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

const hasVideoTrack = (p: MinimalParticipant): boolean => {
  if (!p || !p.videoTrackPublications) {
    console.warn("Invalid participant object passed to hasVideoTrack", p);
    return false;
  }
  return Array.from(p.videoTrackPublications.values()).some(
    (pub: any) => pub.track !== undefined && !pub.isMuted
  );
};

const hasAudioTrack = (p: MinimalParticipant): boolean => {
  if (!p || !p.audioTrackPublications) {
    console.warn("Invalid participant object passed to hasAudioTrack", p);
    return false;
  }
  return Array.from(p.audioTrackPublications.values()).some(
    (pub: any) => pub.track !== undefined && !pub.isMuted
  );
};

// Управление устройствами
const toggleCamera = async () => {
  const local = room.value?.localParticipant;
  if (!local) return;

  // Если камера выключена, нужно включить её (возможно, создать трек)
  if (!state.isCameraEnabled) {
    // Проверяем, есть ли уже опубликованный видео трек
    const videoPubs = [...local.videoTrackPublications.values()];
    const pub = videoPubs.find((p) => p.track?.kind === "video");

    if (pub && localVideoTrack) {
      // Трек существует, просто размутим его
      await pub.unmute();
      // Прикрепляем к элементу, если нужно
      if (localVideoRef.value) {
        // Убедимся, что он прикреплен (может быть уже)
        if (!localVideoTrack.attachedElements.includes(localVideoRef.value)) {
          localVideoTrack.attach(localVideoRef.value);
        }
        state.videoVisible = true;
      }
    } else {
      try {
        const deviceId = deviceState.selectedCamera || undefined;
        localVideoTrack = await createLocalVideoTrack({
          deviceId,
          ...getVideoResolution(),
        });

        // --- ИЗМЕНЕНИЕ 1: Сброс флага при успехе ---
        state.cameraPermissionDenied = false;
        // ------------------------------------------

        await local.publishTrack(localVideoTrack, {
          name: "camera",
        });

        if (localVideoRef.value) {
          localVideoTrack.attach(localVideoRef.value);
          state.videoVisible = true;
        }
        console.log("✅ Камера включена и опубликована");
      } catch (err) {
        console.error("❌ Ошибка включения камеры:", err);

        // --- ИЗМЕНЕНИЕ 2: Уточненное сообщение об ошибке (БЕЗОПАСНО) ---
        let errorMsg = "Не удалось включить камеру.";
        let isPermissionDenied = false;

        // Безопасно проверяем свойства err
        if (err && typeof err === "object") {
          // Проверка по имени ошибки
          const errName = (err as any).name;
          if (
            errName === "NotAllowedError" ||
            errName === "PermissionDeniedError"
          ) {
            isPermissionDenied = true;
          }

          // Проверка по сообщению ошибки
          const errMessage = (err as any).message;
          if (errMessage && typeof errMessage === "string") {
            const msgLower = errMessage.toLowerCase();
            if (
              msgLower.includes("denied") ||
              msgLower.includes("permission") ||
              msgLower.includes("разрешен") ||
              msgLower.includes("permission denied by system") ||
              msgLower.includes("allow") ||
              msgLower.includes("grant")
            ) {
              isPermissionDenied = true;
            }
          }
        }

        if (isPermissionDenied) {
          errorMsg =
            "Доступ к камере запрещен. Пожалуйста, разрешите доступ к камере в настройках браузера и повторите попытку.";
          // --- ИЗМЕНЕНИЕ 3: Установка флага отказа ---
          state.cameraPermissionDenied = true;
          // ------------------------------------------
        } else {
          errorMsg += " Проверьте подключение камеры и настройки браузера.";
        }

        state.error = errorMsg;
        return;
      }
    }
    state.isCameraEnabled = true;
  } else {
    // Камера включена, нужно выключить её
    const videoPubs = [...local.videoTrackPublications.values()];
    const pub = videoPubs.find((p) => p.track?.kind === "video");
    if (pub) {
      await pub.mute();
    }
    // Отключаем отображение, но не останавливаем трек
    state.videoVisible = false;
    state.isCameraEnabled = false;
    console.log("🔇 Камера выключена");
  }
};

const toggleMicrophone = async () => {
  const local = room.value?.localParticipant;
  if (!local) return;

  // Если микрофон выключен, нужно включить его (возможно, создать трек)
  if (!state.isMicEnabled) {
    // Проверяем, есть ли уже опубликованный аудио трек
    const audioPubs = [...local.audioTrackPublications.values()];
    const pub = audioPubs.find((p) => p.track?.kind === "audio");

    if (pub && localAudioTrack) {
      // Трек существует, просто размутим его
      await pub.unmute();
      state.isMicEnabled = true;
      console.log("✅ Микрофон включен");
      // Перезапуск мониторинга аудио может потребоваться, если он останавливался
      startAudioLevelMonitoring();
    } else {
      try {
        const deviceId = deviceState.selectedMicrophone || undefined;
        localAudioTrack = await createLocalAudioTrack({
          deviceId,
          autoGainControl: deviceState.autoGainControl,
          echoCancellation: deviceState.echoCancellation,
          noiseSuppression: deviceState.noiseSuppression,
        });

        // --- ИЗМЕНЕНИЕ 1: Сброс флага при успехе ---
        state.microphonePermissionDenied = false;
        // ------------------------------------------

        await local.publishTrack(localAudioTrack, {
          name: "microphone",
        });
        state.isMicEnabled = true;
        startAudioLevelMonitoring();
        console.log("✅ Микрофон включен и опубликован");
      } catch (err) {
        console.error("❌ Ошибка включения микрофона:", err);

        // --- ИЗМЕНЕНИЕ 2: Уточненное сообщение об ошибке (БЕЗОПАСНО) ---
        let errorMsg = "Не удалось включить микрофон.";
        let isPermissionDenied = false;

        // Безопасно проверяем свойства err
        if (err && typeof err === "object") {
          // Проверка по имени ошибки
          const errName = (err as any).name;
          if (
            errName === "NotAllowedError" ||
            errName === "PermissionDeniedError"
          ) {
            isPermissionDenied = true;
          }

          // Проверка по сообщению ошибки
          const errMessage = (err as any).message;
          if (errMessage && typeof errMessage === "string") {
            const msgLower = errMessage.toLowerCase();
            if (
              msgLower.includes("denied") ||
              msgLower.includes("permission") ||
              msgLower.includes("разрешен") ||
              msgLower.includes("permission denied by system") ||
              msgLower.includes("allow") ||
              msgLower.includes("grant")
            ) {
              isPermissionDenied = true;
            }
          }
        }

        if (isPermissionDenied) {
          errorMsg =
            "Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках браузера и повторите попытку.";
          // --- ИЗМЕНЕНИЕ 3: Установка флага отказа ---
          state.microphonePermissionDenied = true;
          // ------------------------------------------
        } else {
          errorMsg += " Проверьте подключение микрофона и настройки браузера.";
        }

        state.error = errorMsg;
        return;
      }
    }
  } else {
    const audioPubs = [...local.audioTrackPublications.values()];
    const pub = audioPubs.find((p) => p.track?.kind === "audio");
    if (pub) {
      await pub.mute();
    }
    state.isMicEnabled = false;
    console.log("🔇 Микрофон выключен");
  }
};

const leaveRoom = async () => {
  console.log("🚪 Выход из комнаты...");
  if (room.value) {
    // Остановка локальных треков
    if (localVideoTrack) {
      localVideoTrack.stop();
      localVideoTrack = undefined;
    }
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack = undefined;
    }

    await room.value.disconnect();
  }
  router.push("/");
};

onMounted(() => {
  connectToRoom();
  // Запрос разрешений на устройства
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(console.warn);
});

onUnmounted(() => {
  if (room.value) {
    // Остановка локальных треков
    if (localVideoTrack) {
      localVideoTrack.stop();
    }
    if (localAudioTrack) {
      localAudioTrack.stop();
    }

    room.value.disconnect();
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Анимации для переходов */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Кастомные стили для скроллбара */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(75, 85, 99, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

/* Стили для слайдера громкости */
.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: #4b5563;
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.volume-slider::-webkit-slider-thumb:hover {
  background: #2563eb;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.volume-slider::-moz-range-thumb:hover {
  background: #2563eb;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(75, 85, 99, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}
</style>
