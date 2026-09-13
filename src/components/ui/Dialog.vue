<script setup lang="ts">
import { X } from '@lucide/vue'
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    title?: string
    description?: string
  }>(),
  {
    modelValue: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <DialogRoot :open="modelValue" @update:open="(value) => emit('update:modelValue', value)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/60" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-popover focus:outline-none"
      >
        <div v-if="title || description" class="mb-4 space-y-1">
          <DialogTitle v-if="title" class="text-base font-semibold text-foreground">
            {{ title }}
          </DialogTitle>
          <DialogDescription v-if="description" class="text-sm text-muted">
            {{ description }}
          </DialogDescription>
        </div>

        <slot />

        <DialogClose
          class="absolute right-4 top-4 rounded-md p-1 text-subtle transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Cerrar</span>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
