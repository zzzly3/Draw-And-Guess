<template>
  <div class="fullscreen column content-start">
    <div class="col-1" style="overflow: auto">
      <q-bar class="full-height full-width bg-header row justify-center">
        <q-img src="~assets/nnq.jpg" class="col-auto self-center" height="50px" width="50px" fit="scale-down" />
        <div class="text-center col-auto self-center" style="font-size: inherit">
          <span>狮子山庄 - 你画我猜</span>
          <br/>
          <span v-if="!connected" class="text-negative">连接断开</span>
          <span v-if="connected && in_wait" class="text-primary">等待中</span>
          <span v-if="connected && in_select" class="text-accent">{{painter}} 选词中 {{count_down}}秒</span>
          <span v-if="connected && in_draw" class="text-positive">{{painter}} 绘图中 {{count_down}}秒</span>
        </div>
      </q-bar>
    </div>
    <div class="col-auto full-width text-center q-pa-sm q-pt-md" style="overflow: auto">
      <div class="q-pa-sm text-center q-gutter-sm">
        <q-chip v-for="p in players" :key="p.name"
                :color="p.action ? 'accent' : (p.success ? 'positive' : '')"
                :text-color="p.action ? 'white' : (p.success ? 'white' : '')"
                :icon="p.action ? 'brush' : (p.success ? 'check' : 'girl')">
          {{p.name}}
          <q-badge :color="p.name === name ? 'primary' : (p.online ? 'secondary' : 'negative')"
                   floating transparent>
            +{{p.point}}
          </q-badge>
        </q-chip>
      </div>
    </div>
    <div class="col-auto q-ma-sm" style="overflow: auto" v-if="in_wait||in_draw||(in_select&&painter===name)">
      <q-bar class="full-height full-width text-center bg-body">
        <span v-if="in_wait" class="text-center full-width">
          <q-btn color="positive" size="md" @click="start">开始游戏</q-btn>
        </span>
        <span v-if="in_draw" class="text-center full-width text-weight-bold text-accent">
          {{answer}}（提示：{{hint}}）
        </span>
        <span v-if="in_select&&painter===name" class="full-width row">
          <span class="col-auto self-center text-weight-bold text-accent q-px-sm">
            请选词
          </span>
          <span class="col self-center q-px-sm q-gutter-md">
            <q-btn v-for="word in selections" :key="word" @click="select(word.id)"
                   size="md" color="primary" outline>
              {{word.word}}
            </q-btn>
          </span>
        </span>
      </q-bar>
    </div>
    <div class="col full-width q-pa-md" style="overflow: auto">
      <q-virtual-scroll style="height: 100%" component="q-list" class="bg-outstanding rounded-borders"
                        @scroll="scroll_chat" ref="chat" :items="messages" v-slot="{ item, index }">
        <q-item :key="index" dense>
          <q-item-section>
            <q-item-label v-if="item.notify" class="text-primary">
              {{item.author}}{{item.content}}
            </q-item-label>
            <q-item-label v-else class="text-grey-9">
              {{item.author}}：{{item.content}}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-virtual-scroll>
    </div>
    <div class="col-1 full-width q-pl-lg q-pr-sm row" style="overflow: auto">
      <div class="col self-center">
        <q-input outlined dense rounded v-model="send_text" bg-color="amber-1" :disable="painter===name">
          <template v-slot:after>
            <q-btn round dense flat icon="send" color="primary" size="lg" @click="send" />
          </template>
        </q-input>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import {computed, defineComponent, nextTick, onMounted, Ref, ref, watch} from 'vue';
import {useStore} from 'src/store';
import {QVirtualScroll, useQuasar} from 'quasar';

export default defineComponent({
  name: 'IndexPage',
  setup() {
    const store = useStore()
    const $q = useQuasar()

    const chat = ref(null) as Ref<QVirtualScroll|null>
    let last_scroll = 0
    const scroll_chat = () => {
      last_scroll = (new Date()).getTime()
    }
    watch(store.state.gameData.msg, () => {
      if (last_scroll + 5000 < new Date().getTime()) {
        void nextTick(() => chat.value?.scrollTo(store.state.gameData.msg.length))
      }
    })

    const count_down = ref(0)
    setInterval(() => {
      const t = Math.round((new Date()).getTime() / 1000)
      const t2 = store.state.gameData.info.state.timeout
      count_down.value = Math.round(t2 && t < t2 ? t2 - t : 0)

      // store.commit('gameData/add_msg', {author:'test',content:(new Date()).toString(),notify:false})
    }, 1000)

    const connected = computed(() => {
      return store.state.gameData.connect
    })
    const in_wait = computed(() => {
      return store.state.gameData.info.state.wait
    })
    const in_select = computed(() => {
      return store.state.gameData.info.state.select
    })
    const in_draw = computed(() => {
      return store.state.gameData.info.state.draw
    })
    const hint = computed(() => {
      return store.state.gameData.info.state.hint
    })
    const answer = computed(() => {
      return store.state.gameData.info.state.answer
    })
    const name = computed(() => {
      return store.state.gameData.name
    })

    const selections = computed(() => {
      return store.state.gameData.selections
    })
    const select = (id: number) => {
      void store.dispatch('gameData/select', id)
    }

    const start = () => {
      void store.dispatch('gameData/start')
    }

    const send_text = ref('')
    const send = () => {
      if (send_text.value) {
        if (send_text.value[0] === '/') {
          void store.dispatch('gameData/command', send_text.value.slice(1))
        } else {
          void store.dispatch('gameData/answer', send_text.value)
        }
        send_text.value = ''
      }
    }

    const painter = computed(() => {
      const p = store.state.gameData.info.players.filter(i => i.action)
      return p.length ? p[0].name : ''
    })
    const players = computed(() => {
      return store.state.gameData.info.players
    })
    const messages = computed(() => {
      return store.state.gameData.msg
    })

    onMounted(() => {
      if (!store.state.gameData.token) {
        const token = sessionStorage.getItem('token')
        const name = sessionStorage.getItem('name')
        if (!token || !name) {
          $q.dialog({
            title: '登录',
            message: '输入一个昵称',
            prompt: {
              model: '',
              isValid: val => val.length > 2,
              type: 'text'
            },
            persistent: true
          }).onOk(data => {
            const name = String(data)
            const token = String(((new Date()).getTime() % 1000000) * 1000 + Math.floor(Math.random() * 1000))
            sessionStorage.setItem('name', name)
            sessionStorage.setItem('token', token)
            void store.dispatch('gameData/connect', {token, name})
          })
        } else {
          console.log(token, name)
          void store.dispatch('gameData/connect', {token, name})
        }
      }
    })

    return {
      connected,
      name,
      selections, select,
      painter, players, messages,
      count_down, hint, answer,
      in_wait, in_select, in_draw,
      chat, scroll_chat,
      start,
      send_text, send
    }
  }
})

</script>
