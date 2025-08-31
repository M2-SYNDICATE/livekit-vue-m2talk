<template>
  <div
    v-if="isMaintenancePeriod"
    class="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500 to-pink-600 text-white text-center py-2 text-sm font-medium shadow-md z-50"
  >
    <span class="flex items-center justify-center space-x-2">
      <svg
        class="w-4 h-4 animate-pulse"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4.87c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>
        С 00:00 до 08:00 (МСК) вычислительные мощности не работают. Спасибо за
        понимание
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

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
  return hour >= 0 && hour < 8;
});
</script>
