<template>
    <q-btn :style="'color: white; background:'+color" round icon="palette">
        <q-popup-proxy>
            <q-color v-model="color" default-view="palette" v-close-popup no-header-tabs no-footer />
        </q-popup-proxy>
    </q-btn>
</template>

<script setup lang="ts">

import { computed } from 'vue'

const props = defineProps({
    modelValue: {
        type: String,
        required: true
    }
})

const emit = defineEmits([
    'update:modelValue'
])

const color = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
})


</script>