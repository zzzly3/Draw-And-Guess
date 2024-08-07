import {ActionTree, Module, MutationTree} from 'vuex';
import {io} from 'socket.io-client';
import {StateInterface} from 'src/store/index';
import {Dialog} from 'quasar';
import RankDialog from 'src/components/RankDialog.vue';
import AnswerDialog from 'src/components/AnswerDialog.vue';

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
  players: {
      name: string,
      point: number,
      online: boolean,
      action: boolean,
      success: boolean
  }[]
}

interface MsgInfo {
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
    connect({state, commit}, {token, name, drawfn}: {token: number, name: string, drawfn: (type: string, points: [number, number][]) => void}) {
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
    }
  } as ActionTree<GameData, StateInterface>
} as Module<GameData, StateInterface>

export default gameData
