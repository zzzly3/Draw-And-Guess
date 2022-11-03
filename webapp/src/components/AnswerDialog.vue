<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin q-ma-xl">
      <q-card-section class="text-h6 text-center q-mt-sm text-primary">
        答 案
      </q-card-section>
      <q-separator inset />
      <q-card-section class="q-ma-sm">
        <div class="text-center text-weight-bold">{{answer}}</div>
      </q-card-section>
      <q-card-section v-for="(item, index) in success" :key="index" class="q-ma-sm text-center q-mr-md">
        <q-icon name="check" color="positive" /> {{item}}
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide } = useDialogPluginComponent()

defineProps({
  answer: {
    type: String,
    required: true
  },
  success: {
    type: Array as () => Array<string>,
    required: true
  }
})

</script>

