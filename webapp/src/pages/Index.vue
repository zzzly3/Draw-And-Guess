<template>
  <div class="fullscreen column content-start">
    <div class="col-1" style="overflow: auto">
      <q-bar class="full-height full-width bg-header row justify-center">
        <q-img src="~assets/qiao2.jpg" class="col-auto self-center" height="50px" width="50px" fit="scale-down" />
        <div class="text-center col-auto self-center" style="font-size: inherit">
          <span v-if="in_draw&&painter!==name" class="text-weight-bold text-accent">{{guest?answer:''}}（提示：{{hint}}）</span>
          <span v-else>常鸽 - 你想我拆</span>
          <br/>
          <span v-if="!connected" class="text-negative">连接断开</span>
          <span v-if="connected && in_wait" class="text-primary">等待中</span>
          <span v-if="connected && in_select" class="text-accent">{{painter}} 选词中 {{count_down}}秒</span>
          <span v-if="connected && in_draw" class="text-positive">{{painter}} 绘图中 {{count_down}}秒</span>
        </div>
      </q-bar>
    </div>
    <div class="col-auto full-width text-center q-px-sm q-pt-sm" style="overflow: auto">
      <div class="q-pa-sm text-center q-gutter-sm">
        <q-chip v-for="p in players" :key="p.name" clickable @click="click_user(p)" v-ripple
                :color="p.action ? 'accent' : (p.success ? 'positive' : p.local_bg_color)"
                :text-color="p.action ? 'white' : (p.success ? 'white' : '')"
                :icon="p.action ? 'brush' : (p.success ? 'check' : p.icon)">
          {{p.name}}
          <q-badge :color="p.name === name ? 'primary' : (p.online ? 'secondary' : 'negative')"
                   floating transparent>
            +{{p.point}}
          </q-badge>
        </q-chip>
      </div>
    </div>
    <div class="col-auto q-mx-sm q-mb-sm" style="overflow: auto" v-if="!guest&&(in_wait||((in_draw||in_select)&&painter===name))">
      <q-bar class="full-height full-width text-center bg-body">
        <span v-if="in_wait" class="text-center full-width">
          <q-btn color="positive" size="md" @click="start">开始游戏</q-btn>
          <PopupColorPicker class="on-right" v-model="painterColor" />
          <q-btn color="primary" class="on-right" round icon="cleaning_services" @click="canvas_clear"></q-btn>
        </span>
        <span v-if="in_draw&&painter===name" class="text-center full-width text-weight-bold text-accent">
          {{answer}}（提示：{{hint}}）
          <PopupColorPicker v-model="painterColor" />
          <q-btn color="primary" class="on-right" round icon="cleaning_services" @click="canvas_clear"></q-btn>
        </span>
        <span v-if="in_select&&painter===name" class="full-width row">
          <span class="col-auto self-center text-weight-bold text-accent q-px-sm">
            请选词
          </span>
          <span class="col self-center q-px-sm q-gutter-md">
            <q-btn v-for="word in selections" :key="word.id" @click="select(word.id)"
                   size="md" color="primary" outline>
              {{word.word}}
            </q-btn>
            <q-btn @click="custom_select" size="md" color="positive" outline :disable="credit===0">
              自定义 ({{credit}})
            </q-btn>
          </span>
        </span>
      </q-bar>
    </div>
    <div class="col full-width q-px-md">
      <canvas id="canvas" class="full-width bg-lime-1 shadow-1" style="height: 100%"
              @mousedown="canvas_mouse_down" @mouseup="canvas_mouse_up" @mousemove.prevent="canvas_mouse_move"
              @touchstart="canvas_touch_start" @touchend="canvas_touch_end" @touchmove.prevent="canvas_touch_move" />
    </div>
    <div class="col-3 full-width q-px-md q-pt-sm" style="overflow: auto">
      <q-virtual-scroll style="height: 100%" component="q-list" class="bg-outstanding rounded-borders"
                        @scroll="scroll_chat" ref="chat" :items="messages" v-slot="{ item, index }">
        <q-item :key="index" dense class="text-caption" style="min-height:18px;" >
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
    <div class="col-auto full-width q-pl-lg q-pr-sm q-py-sm row" style="overflow: auto">
      <div class="col self-center">
        <q-input outlined dense rounded v-model="send_text" bg-color="amber-1" @keypress.enter="send" :disable="guest||painter===name">
          <template v-slot:after>
            <q-btn round dense flat icon="send" color="primary" size="lg" @click="send" :disable="guest||painter===name" />
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
import PopupColorPicker from 'src/components/PopupColorPicker.vue';
import { Player } from 'src/store/gamedata';

export default defineComponent({
  name: 'IndexPage',
  components: {
    PopupColorPicker
  },
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
    const guest = computed(() => {
      return store.state.gameData.guest
    })
    const credit = computed(() => {
      return store.state.gameData.info.state.credit
    })

    const selections = computed(() => {
      return store.state.gameData.selections
    })
    const select = (id: number) => {
      void store.dispatch('gameData/select', {id, custom: ''})
    }
    const custom_select = () => {
      $q.dialog({
        title: '自定义词语',
        message: '输入一个词语（不超过9个字）',
        prompt: {
          model: '',
          isValid: val => val.trim().length > 0 && val.trim().length < 10,
          type: 'text'
        },
        cancel: true
      }).onOk(data => {
        void store.dispatch('gameData/select', {id: -1, custom: String(data).trim()})
      })
    }

    const start = () => {
      void store.dispatch('gameData/start')
    }

    const click_user = (p: Player) => {
      // console.log(p)
      if (p.name === name.value && !p.action && !p.success)
        void store.dispatch('gameData/randomIcon')
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
    
    let canvas = null as HTMLCanvasElement|null
    let ctx = null as CanvasRenderingContext2D|null
    let isDrawing = false
    let pathDrawing = [] as [number, number][]
    let painterColor = ref('#000000')
    watch(painterColor, () => {
      if (ctx) {
        ctx.strokeStyle = painterColor.value
      }
    })
    const start_paint = (x: number, y: number) => {
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.arc(x, y, ctx.lineWidth / 10, 0, 2 * Math.PI)
      ctx.fill()
      pathDrawing = [[x, y]]
    }
    const end_paint = () => {
      if (!ctx) return
      ctx.stroke()
      ctx.beginPath()
      void store.dispatch('gameData/draw', {type: painterColor.value, points: pathDrawing})
      pathDrawing = []
    }
    const in_paint = (x: number, y: number) => {
      if (!ctx) return
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y)
      pathDrawing.push([x, y])
    }
    const canvas_mouse_down = (event: MouseEvent) => {
      if (!canvas) return
      if (guest.value || !(in_wait.value || (in_draw.value && painter.value === name.value))) return
      const rect = canvas.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width * canvas.width
      const y = (event.clientY - rect.top) / rect.height * canvas.height
      isDrawing = true
      start_paint(x, y)
    }
    const canvas_mouse_move = (event: MouseEvent) => {
      if (isDrawing) {
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width * canvas.width
        const y = (event.clientY - rect.top) / rect.height * canvas.height
        in_paint(x, y)
      }
    }
    const canvas_mouse_up = () => {
      if (isDrawing) {
        end_paint()
        isDrawing = false
      }
    }
    const canvas_touch_start = (event: TouchEvent) => {
      if (!canvas) return
      if (guest.value || !(in_wait.value || (in_draw.value && painter.value === name.value))) return
      const rect = canvas.getBoundingClientRect()
      const x = (event.touches[0].clientX - rect.left) / rect.width * canvas.width
      const y = (event.touches[0].clientY - rect.top) / rect.height * canvas.height
      isDrawing = true
      start_paint(x, y)
    }
    const canvas_touch_move = (event: TouchEvent) => {
      if (isDrawing) {
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = (event.touches[0].clientX - rect.left) / rect.width * canvas.width
        const y = (event.touches[0].clientY - rect.top) / rect.height * canvas.height
        in_paint(x, y)
      }
    }
    const canvas_touch_end = () => {
      if (isDrawing) {
        end_paint()
        isDrawing = false
      }
    }
    const canvas_clear = () => {
      if (!canvas || !ctx) return
      void store.dispatch('gameData/draw', {type: 'clear', points: []})
      ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0)
    }

    onMounted(() => {
      if (!store.state.gameData.token) {
        canvas = document.getElementById('canvas') as HTMLCanvasElement
        canvas.width = 1000
        canvas.height = 1000
        ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        ctx.lineWidth = 8
        const drawfn = (type: string, points: [number, number][]) => {
          if (!ctx || !canvas) return
          if (type === 'clear') {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            return
          }
          ctx.strokeStyle = type
          ctx.beginPath()
          ctx.arc(points[0][0], points[0][1], ctx.lineWidth / 10, 0, 2 * Math.PI)
          ctx.fill()
          for (const p of points) {
            ctx.lineTo(p[0], p[1])
          }
          ctx.stroke()
          ctx.strokeStyle = painterColor.value
        }
        let token = Number(localStorage.getItem('token'))
        let name = sessionStorage.getItem('name')
        if (!token) {
          token = ((new Date()).getTime() % 1000000) * 1000 + Math.floor(Math.random() * 1000)
          localStorage.setItem('token', String(token))
        }
        if (!name) {
          const show_login = () => {
            $q.dialog({
              title: '登录',
              message: '输入一个昵称（2-9个字）或输入guest进入旁观模式',
              prompt: {
                model: '',
                isValid: val => val.trim().length >= 2 && val.trim().length <= 9,
                type: 'text'
              },
              persistent: true
            }).onOk(data => {
              name = String(data).trim()
              sessionStorage.setItem('name', name)
              void store.dispatch('gameData/connect', {token, name, drawfn})
            })
          }
          if (navigator.userAgent.indexOf('WeChat') >= 0) {
            $q.dialog({
              title: '提示',
              message: '您正在微信APP内打开本游戏，可能导致您回复微信消息时意外断线且无法正确重连。为了您的游戏体验，强烈建议您改用浏览器打开本游戏。'
            }).onDismiss(() => {
              show_login()
            })
          } else {
            show_login()
          }
        } else {
          console.log(token, name)
          void store.dispatch('gameData/connect', {token, name, drawfn})
        }
      }
    })

    return {
      painterColor,
      connected, guest,
      name, credit,
      selections, select, custom_select,
      painter, players, messages,
      count_down, hint, answer,
      in_wait, in_select, in_draw,
      chat, scroll_chat,
      start, click_user,
      send_text, send,
      canvas_clear,
      canvas_mouse_down, canvas_mouse_move, canvas_mouse_up,
      canvas_touch_start, canvas_touch_move, canvas_touch_end
    }
  }
})

</script>
