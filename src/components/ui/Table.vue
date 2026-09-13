<script setup lang="ts">
// Shell minimo de tabla (reset + tokens). Los <thead>/<tbody> especificos de cada
// vista (movimientos, obligaciones, tarjetas) se escriben en Fase 6-9 usando las
// mismas clases utilitarias documentadas aca como referencia:
//   th: "border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted"
//   td: "border-b border-border px-3 py-2 text-sm text-foreground"
//   tr[data-state=hover]: "hover:bg-surface-muted/60"
withDefaults(
  defineProps<{
    class?: string
  }>(),
  {},
)
</script>

<template>
  <div class="w-full overflow-x-auto rounded-lg border border-border">
    <table class="w-full border-collapse text-sm" :class="$props.class">
      <slot />
    </table>
  </div>
</template>
