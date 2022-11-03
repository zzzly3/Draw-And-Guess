<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin q-ma-xl">
      <q-card-section class="text-h6 text-center q-mt-sm text-primary">
        游 戏 结 束
      </q-card-section>
      <q-separator inset />
      <q-card-section v-for="(item, index) in rank" :key="index" class="row q-ma-sm">
        <div class="col text-center">第{{index+1}}名</div>
        <div class="col text-center text-weight-bold">{{item.name}}</div>
        <div class="col text-center">{{item.score}}分</div>
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
  rank: {
    type: Array as () => Array<{score:number, name: string}>,
    required: true
  }
})

</script>

