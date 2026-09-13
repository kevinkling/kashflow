<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

// Reemplaza #confirmationModal (Bootstrap) de public/index.html. Instancia unica,
// montada en App.vue; cualquier vista dispara useConfirmDialog().confirm({...}).
const { state, accept, cancel } = useConfirmDialog()
</script>

<template>
  <Dialog :model-value="state.open" :title="state.title" :description="state.description" @update:model-value="(open) => !open && cancel()">
    <div class="mt-4 flex justify-end gap-2">
      <Button variant="outline" size="sm" @click="cancel">{{ state.cancelLabel }}</Button>
      <Button :variant="state.variant === 'danger' ? 'danger' : 'primary'" size="sm" @click="accept">
        {{ state.confirmLabel }}
      </Button>
    </div>
  </Dialog>
</template>
