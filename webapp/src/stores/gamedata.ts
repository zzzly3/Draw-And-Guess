import { defineStore } from 'pinia';
import {io} from 'socket.io-client';
import {Dialog} from 'quasar';
import RankDialog from 'components/RankDialog.vue';
import AnswerDialog from 'components/AnswerDialog.vue';

const icon_list: string[] = ['person', 'groups', 'account_circle', 'face', 'group', 'badge', 'engineering', 'account_box',
  'assignment_ind', 'psychology', 'emoji_emotions', 'sentiment_very_satisfied', 'sentiment_satisfied_alt', 'accessibility',
  'directions_run', 'accessibility_new', 'sentiment_dissatisfied', 'directions_walk', 'sentiment_very_dissatisfied',
  'emoji_people', 'self_improvement', 'mood', 'directions_bike', 'accessible', 'hotel', 'mood_bad', 'pool', 'diversity_3',
  '3p', 'hail', 'accessible_forward', 'sports_kabaddi', 'escalator_warning', 'bathtub', 'sick', 'rowing', 'nature_people',
  'elderly', 'diversity_1', 'personal_injury', 'attribution', 'surfing', 'sports_handball', 'run_circle', 'airline_seat_recline_normal',
  'diversity_2', 'kayaking', 'remember_me', 'downhill_skiing', 'skateboarding', 'boy', 'hot_tub', 'sports_martial_arts',
  'nordic_walking', 'girl', 'airline_seat_recline_extra', 'face_6', 'snowboarding', 'local_hotel', 'elderly_woman',
  'person_2', 'sledding', 'face_2', 'face_4', 'airline_seat_individual_suite', 'face_5', 'person_4', 'person_3', 'assist_walker',
  'pets', 'cruelty_free', 'emoji_nature', 'spa', 'home', 'apartment', 'cottage', 'grass', 'shower', 'kitchen', 'chair', 'bed',
  'holiday_village', 'weekend', 'electric_bolt', 'outdoor_grill', 'foundation', 'deck', 'gite', 'villa', 'night_shelter',
  'bedtime', 'microwave', 'chair_alt', 'single_bed', 'countertops', 'doorbell', 'shield_moon', 'houseboat', 'wind_power',
  'local_shipping', 'directions_car', 'sports_esports', 'flight', 'directions_bus', 'sports_soccer', 'directions_bike',
  'train', 'airport_shuttle', 'hiking', 'two_wheeler', 'directions_boat', 'pedal_bike', 'sailing', 'sports_bar', 'sports',
  'sports_tennis', 'sports_motorsports', 'sports_baseball', 'sports_volleyball', 'sports_football', 'sports_cricket']

let delay_rank = false
let rank: {score: number, name: string}[] = []
let socket: ReturnType<typeof io>
let first_connect = true

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

export const useGameData = defineStore('gamedata', {
  state: () => ({
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
  } as GameData),
  getters: {
    
  },
  actions: {
    add_msg(content: string, author: string = '', notify: boolean = true) {
      this.msg.push({author, content, notify})
    },
    get_player(name: string) {
      return this.info.players.find(p => p.name === name)
    },
    localhighlight_player(player: Player, color: string = 'orange', depth: number = 5) {
      if (depth === 1) {  // depth=1 seems too white so we skip it
        player.local_bg_color = ''
        return
      }
      player.local_bg_color = color + '-' + String(depth)
      setTimeout(() => {
        this.localhighlight_player(player, color, depth - 1)
      }, 60)
    },
    do_connect(token: number, name: string, drawfn: (type: string, points: [number, number][]) => void) {
      if (this.connect)
        return
      this.token = token
      this.name = name
      this.guest = name.toLocaleLowerCase() === 'guest'
      if (socket) {
        socket.connect()
        return
      }
      socket = io()
      socket.on('connect', () => {
        if (this.guest)
          socket.emit('guest-login')
        else
          socket.emit('login', {token, name})
        this.connect = true
        if (first_connect) {
          this.add_msg( '【提示】建议您在系统浏览器中打开本游戏，启用全屏模式体验更佳~')
          first_connect = false
        }
      })
      socket.on('disconnect', () => {
        this.connect = false
      })
      socket.on('update-all', (data: GameInfo) => {
        this.info = data
        console.log(data)
      })
      socket.on('update-icon', (data: {name: string, icon: string}) => {
        const player = this.get_player(data.name)
        if (player) {
          player.icon = data.icon
          if (data.name !== name)
            this.localhighlight_player(player)
        }
      }),
      socket.on('chat', (data: {name: string|null, msg: string}) => {
        this.add_msg(data.msg, data.name ? String(data.name) : '', data.name === null)
      })
      socket.on('selections', (data: {id: number, word: string}[]) => {
        this.selections = data
      })
      socket.on('start', () => {
        console.log('start')
        this.add_msg('咕咕咕，游戏开始！')
      })
      socket.on('end', () => {
        console.log('end')
        rank = this.info.players.map(p => ({score: p.point, name: p.name})).sort((a, b) => {
            if (a.score < b.score)
              return 1
            else if (a.score > b.score)
              return -1
            return 0
          })
        this.add_msg(`游戏结束，第一名是【${rank[0]?.name}】，太厉害啦！`)
        if (!delay_rank) {
          Dialog.create({
            component: RankDialog,
            componentProps: {
              rank
            }
          })
          rank = []
        }
      })
      socket.on('gain-point', (data: {name: string, point: number}) => {
        this.add_msg(`分数【+${data.point}】！`, data.name)
      })
      socket.on('gain-credit', (data: {amount: number}) => {
        this.add_msg(`恭喜~你获得了${data.amount}张自定义词语卡，快去整点乐子吧！`)
      })
      socket.on('speedup', () => {
        this.add_msg('时间缩短为10秒，加油！')
      })
      socket.on('bingo', () => {
        this.add_msg('回答正确！')
      })
      socket.on('round-done', (data: {success: string[], answer: string}) => {
        this.add_msg(`本轮结束，答案是【${data.answer}】，共${data.success.length}人答对！`)
        delay_rank = true
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
          delay_rank = false
        })
      })
      socket.on('join', (user: {name: string}) => {
        this.add_msg(user.name + '加入了游戏')
      })
      socket.on('leave', (user: {name: string}) => {
        this.add_msg(user.name + '离开了游戏')
      })
      socket.on('draw', (data: {from: number, type: string, points: [number, number][]}) => {
        // console.log(data)
        if (data.from === token % 100003)
          return
        drawfn(data.type, data.points)
      })
    },
    start() {
      socket?.volatile.emit('start')
    },
    select(id: number, custom: string = '') {
      socket?.volatile.emit('select', {id, custom})
    },
    answer(msg: string) {
      socket?.volatile.emit('answer', msg)
    },
    command(cmd: string) {
      socket?.volatile.emit('command', cmd)
    },
    draw(type: string, points: [number, number][] = []) {
      socket?.volatile.emit('draw', {type, points})
    },
    random_icon() {
      const icon = icon_list[Math.floor(Math.random() * icon_list.length)]
      socket?.volatile.emit('seticon', icon)
    },
  },
});
