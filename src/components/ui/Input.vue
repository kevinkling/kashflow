<script setup lang="ts">
import { computed } from 'vue'

import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    type?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    class?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    disabled: false,
    invalid: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const classes = computed(() =>
  cn(
    'flex h-10 w-full rounded-md border bg-surface-muted px-3 text-sm text-foreground placeholder:text-subtle',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
    'disabled:cursor-not-allowed disabled:opacity-50',
    props.invalid ? 'border-debe focus-visible:ring-debe/50' : 'border-border',
    props.class,
  ),
)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="classes"
    @input="onInput"
  />
</template>
