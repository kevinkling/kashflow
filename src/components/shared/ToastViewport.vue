<script setup lang="ts">
import { cn } from '@/lib/utils'
import { useToast } from '@/composables/useToast'

// Reemplaza el showAlert() de public/js/journal.js (alert Bootstrap fijo, 3s).
const { toasts, dismiss } = useToast()

const variantClasses: Record<string, string> = {
  info: 'border-info/40 bg-info/10 text-info',
  success: 'border-haber/40 bg-haber/10 text-haber',
  warning: 'border-primary/40 bg-primary/10 text-primary',
  danger: 'border-debe/40 bg-debe/10 text-debe',
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-xs flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="cn('pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-popover', variantClasses[toast.variant])"
        role="alert"
        @click="dismiss(toast.id)"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
