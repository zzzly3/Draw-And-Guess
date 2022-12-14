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
    answer: string
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
  connect: boolean,
  info: GameInfo,
  msg: MsgInfo[],
  selections: {id: number, word: string}[]
}

let rank: {score: number, name: string}[] = []
let socket: ReturnType<typeof io>

const gameData = {
  namespaced: true,
  state() {
    return {
      token: 0,
      name: '',
      connect: false,
      info: {
        state: {
          wait: false,
          select: false,
          draw: false,
          hint: '',
          answer: '',
          timeout: 0
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
    add_msg(state, msg: MsgInfo) {
      state.msg.push(msg)
    },
    set_selections(state, selections: {id: number, word: string}[]) {
      state.selections = selections
    }
  } as MutationTree<GameData>,

  actions: {
    connect({state, commit}, {token, name}: {token: number, name: string}) {
      if (state.connect)
        return
      commit('init', {token, name})
      if (socket) {
        socket.connect()
        return
      }
      socket = io()
      socket.on('connect', () => {
        socket.emit('login', {token, name})
        commit('connect')
      })
      socket.on('disconnect', () => {
        commit('disconnect')
      })
      socket.on('update-all', (data: GameInfo) => {
        commit('updateAll', data)
        console.log(data)
      })
      socket.on('chat', (data: {name: string, msg: string}) => {
        commit('add_msg', {
          author: data.name,
          content: data.msg,
          notify: false
        })
      })
      socket.on('selections', (data: {id: number, word: string}[]) => {
        commit('set_selections', data)
      })
      socket.on('start', () => {
        console.log('start')
        commit('add_msg', {
          author: '',
          content: '????????????????????????????????????',
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
          content: `??????????????????????????????${rank[0]?.name}?????????????????????`,
          notify: true
        })
      })
      socket.on('gain', (data: {name: string, point: number}) => {
        commit('add_msg', {
          author: data.name,
          content: `?????????+${data.point}??????`,
          notify: true
        })
      })
      socket.on('speedup', () => {
        commit('add_msg', {
          author: '',
          content: '???????????????10???????????????',
          notify: true
        })
      })
      socket.on('bingo', () => {
        commit('add_msg', {
          author: '',
          content: '???????????????',
          notify: true
        })
      })
      socket.on('round-done', (data: {success: string[], answer: string}) => {
        commit('add_msg', {
          author: '',
          content: `???????????????????????????${data.answer}?????????${data.success.length}????????????`,
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
          content: '???????????????',
          notify: true
        })
      })
      socket.on('leave', (user: {name: string}) => {
        commit('add_msg', {
          author: user.name,
          content: '???????????????',
          notify: true
        })
      })
    },
    start() {
      socket?.volatile.emit('start')
    },
    select({}, id: number) {
      socket?.volatile.emit('select', id)
    },
    answer({}, msg: string) {
      socket?.volatile.emit('answer', msg)
    },
    command({}, cmd: string) {
      socket?.volatile.emit('command', cmd)
    }
  } as ActionTree<GameData, StateInterface>
} as Module<GameData, StateInterface>

export default gameData
