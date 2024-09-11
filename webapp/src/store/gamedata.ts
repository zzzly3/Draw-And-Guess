import {ActionTree, Module, MutationTree} from 'vuex';
import {io} from 'socket.io-client';
import {StateInterface} from 'src/store/index';
import {Dialog} from 'quasar';
import RankDialog from 'src/components/RankDialog.vue';
import AnswerDialog from 'src/components/AnswerDialog.vue';

const icon_list: string[] = ['person', 'groups', 'account_circle', 'face', 'group', 'badge', 'engineering', 'account_box',
  'assignment_ind', 'psychology', 'emoji_emotions', 'sentiment_very_satisfied', 'sentiment_satisfied_alt', 'accessibility',
  'directions_run', 'accessibility_new', 'sentiment_dissatisfied', 'directions_walk', 'sentiment_very_dissatisfied',
  'emoji_people', 'self_improvement', 'mood', 'directions_bike', 'accessible', 'hotel', 'mood_bad', 'pool', 'diversity_3',
  '3p', 'hail', 'accessible_forward', 'sports_kabaddi', 'escalator_warning', 'bathtub', 'sick', 'rowing', 'nature_people',
  'elderly', 'diversity_1', 'personal_injury', 'attribution', 'surfing', 'sports_handball', 'run_circle', 'airline_seat_recline_normal',
  'diversity_2', 'kayaking', 'remember_me', 'downhill_skiing', 'skateboarding', 'boy', 'hot_tub', 'sports_martial_arts',
  'nordic_walking', 'girl', 'airline_seat_recline_extra', 'face_6', 'snowboarding', 'local_hotel', 'elderly_woman',
  'person_2', 'sledding', 'face_2', 'face_4', 'airline_seat_individual_suite', 'face_5', 'person_4', 'person_3', 'assist_walker']

export interface Player {
  name: string,
  point: number,
  icon: string,
  online: boolean,
  action: boolean,
  success: boolean,
  local_bg_color: string
}

interface GameInfo {
  state: {
    wait: boolean,
    select: boolean,
    draw: boolean,
    hint: string,
    answer: string,
    credit: number,
    timeout: number
  },
  players: Player[]
}

export interface MsgInfo {
  author: string,
  content: string,
  notify: boolean
}

export interface GameData {
  token: number,
  name: string,
  guest: boolean,
  connect: boolean,
  info: GameInfo,
  msg: MsgInfo[],
  selections: {id: number, word: string}[]
}

let rank: {score: number, name: string}[] = []
let socket: ReturnType<typeof io>
let first_connect = true

const gameData = {
  namespaced: true,
  state() {
    return {
      token: 0,
      name: '',
      guest: false,
      connect: false,
      info: {
        state: {
          wait: false,
          select: false,
          draw: false,
          hint: '',
          answer: '',
          timeout: 0,
          credit: 0
        },
        players: []
      },
      msg: [],
      selections: []
    } as GameData
  },

  mutations: {
    connect(state) {
      state.connect = true
    },
    disconnect(state) {
      state.connect = false
    },
    updateAll(state, info: GameInfo) {
      console.log(info)
      state.info = info
    },
    update_icon_by_name(state, {name, icon}: {name: string, icon: string}) {
      for (const player of state.info.players) {
        if (player.name === name) {
          player.icon = icon
        }
      }
    },
    update_local_bg_color(state, {name, color}: {name: string, color: string}) {
      for (const player of state.info.players) {
        if (player.name === name) {
          player.local_bg_color = color
        }
      }
    },
    init(state, {token, name}: {token: number, name: string}) {
      state.token = token
      state.name = name
    },
    set_guest(state, guest: boolean) {
      state.guest = guest
      state.name = ''
    },
    add_msg(state, msg: MsgInfo) {
      state.msg.push(msg)
    },
    set_selections(state, selections: {id: number, word: string}[]) {
      state.selections = selections
    }
  } as MutationTree<GameData>,

  actions: {
    connect({state, commit, dispatch}, {token, name, drawfn}: {token: number, name: string, drawfn: (type: string, points: [number, number][]) => void}) {
      if (state.connect)
        return
      commit('init', {token, name})
      if (name.toLocaleLowerCase() === 'guest')
        commit('set_guest', true)
      if (socket) {
        socket.connect()
        return
      }
      socket = io()
      socket.on('connect', () => {
        if (state.guest)
          socket.emit('guest-login')
        else
          socket.emit('login', {token, name})
        commit('connect')
        if (first_connect) {
          commit('add_msg', {
            author: '【温馨提示】',
            content: '建议您在系统浏览器中打开本游戏，启用全屏模式体验更佳~',
            notify: true
          })
          first_connect = false
        }
      })
      socket.on('disconnect', () => {
        commit('disconnect')
      })
      socket.on('update-all', (data: GameInfo) => {
        commit('updateAll', data)
        console.log(data)
      })
      socket.on('update-icon', (data: {name: string, icon: string}) => {
        commit('update_icon_by_name', data)
        if (data.name !== name)
          void dispatch('localHighlight', {name: data.name})
      }),
      socket.on('chat', (data: {name: string|null, msg: string}) => {
        commit('add_msg', {
          author: data.name ? String(data.name) : '',
          content: data.msg,
          notify: data.name === null
        })
      })
      socket.on('selections', (data: {id: number, word: string}[]) => {
        commit('set_selections', data)
      })
      socket.on('start', () => {
        console.log('start')
        commit('add_msg', {
          author: '',
          content: '咕咕咕，游戏开始！',
          notify: true
        })
      })
      socket.on('end', () => {
        console.log('end')
        rank = state.info.players.map(p => ({score: p.point, name: p.name})).sort((a, b) => {
            if (a.score < b.score)
              return 1
            else if (a.score > b.score)
              return -1
            return 0
          })
        commit('add_msg', {
          author: '',
          content: `游戏结束，第一名是【${rank[0]?.name}】，太厉害啦！`,
          notify: true
        })
      })
      socket.on('gain-point', (data: {name: string, point: number}) => {
        commit('add_msg', {
          author: data.name,
          content: `分数【+${data.point}】！`,
          notify: true
        })
      })
      socket.on('gain-credit', (data: {amount: number}) => {
        commit('add_msg', {
          author: '',
          content: `恭喜~你获得了${data.amount}张自定义词语卡，快去整点乐子吧！`,
          notify: true
        })
      })
      socket.on('speedup', () => {
        commit('add_msg', {
          author: '',
          content: '时间缩短为10秒，加油！',
          notify: true
        })
      })
      socket.on('bingo', () => {
        commit('add_msg', {
          author: '',
          content: '回答正确！',
          notify: true
        })
      })
      socket.on('round-done', (data: {success: string[], answer: string}) => {
        commit('add_msg', {
          author: '',
          content: `本轮结束，答案是【${data.answer}】，共${data.success.length}人答对！`,
          notify: true
        })
        Dialog.create({
          component: AnswerDialog,
          componentProps: {
            answer: data.answer,
            success: data.success
          }
        }).onDismiss(() => {
          if (rank.length) {
            Dialog.create({
              component:  RankDialog,
              componentProps: {
                rank
              }
            })
            rank = []
          }
        })
      })
      socket.on('join', (user: {name: string}) => {
        commit('add_msg', {
          author: user.name,
          content: '加入了游戏',
          notify: true
        })
      })
      socket.on('leave', (user: {name: string}) => {
        commit('add_msg', {
          author: user.name,
          content: '离开了游戏',
          notify: true
        })
      })
      socket.on('draw', (data: {from: number, type: string, points: [number, number][]}) => {
        // console.log(data)
        if (data.from === state.token)
          return
        drawfn(data.type, data.points)
      })
    },
    start() {
      socket?.volatile.emit('start')
    },
    select({}, data: {id: number, custom: string}) {
      socket?.volatile.emit('select', data)
    },
    answer({}, msg: string) {
      socket?.volatile.emit('answer', msg)
    },
    command({}, cmd: string) {
      socket?.volatile.emit('command', cmd)
    },
    draw({}, data: {type: string, points: [number, number][]}) {
      socket?.volatile.emit('draw', data)
    },
    randomIcon() {
      const icon = icon_list[Math.floor(Math.random() * icon_list.length)]
      socket?.volatile.emit('seticon', icon)
    },
    localHighlight({commit, dispatch}, {name, color='orange', depth=5}: {name: string, color?: string, depth?: number}) {
      if (depth === 1) {
        commit('update_local_bg_color', {name, color: ''})
        return
      }
      commit('update_local_bg_color', {name, color: color + '-' + String(depth)})
      setTimeout(() => {
        void dispatch('localHighlight', {name, color, depth: depth - 1})
      }, 60)
    }
  } as ActionTree<GameData, StateInterface>
} as Module<GameData, StateInterface>

export default gameData
