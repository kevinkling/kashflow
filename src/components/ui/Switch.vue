<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    disabled?: boolean
    class?: string
  }>(),
  {
    modelValue: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <SwitchRoot
    :model-value="modelValue"
    :disabled="disabled"
    :class="
      cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-border bg-surface-muted',
        'transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <SwitchThumb
      class="pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-foreground shadow-card transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-white"
    />
  </SwitchRoot>
</template>
