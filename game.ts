import {Emitter} from './emitter';
import {get_puzzle_info, Puzzle, random_puzzles} from './puzzles';

export class Player
{
    public name: string
    public token: number
    private point: number
    private online: boolean
    private list: {next: Player, prev: Player}
    private emitter: Emitter

    constructor(token: number, name: string, emitter: Emitter) {
        this.name = name
        this.token = token
        this.point = 0
        this.list = {next: this, prev: this}
        this.online = false
        this.emitter = emitter
        this.reset_point()
    }

    info() {
        return {name: this.name, point: this.get_point(), online: this.get_online()}
    }

    emit(type: string, data?: any) {
        this.emitter.emit(this.token, type, data)
    }

    chat(msg: string) {
        this.emitter.emit(0, 'chat', {name: this.name, msg})
    }

    get_next() {
        return this.list.next
    }

    get_prev() {
        return this.list.prev
    }

    attach(player: Player) {
        player.list.next = this.list.next
        player.list.prev = this
        this.list.next.list.prev = player
        this.list.next = player
    }

    detach() {
        this.list.next.list.prev = this.list.prev
        this.list.prev.list.next = this.list.next
    }

    set_online() {
        this.online = true
        this.emitter.emit(0, 'join', {name: this.name})
    }

    set_offline() {
        this.online = false
        this.emitter.emit(0, 'leave', {name: this.name})
    }

    get_online() {
        return this.online
    }

    add_point(pt: number) {
        this.point += pt
        this.emitter.emit(0, 'gain', {name: this.name, point: pt})
    }

    get_point() {
        return this.point
    }

    reset_point() {
        this.point = 0
    }
}

enum GameState {
    Wait, Select, Draw
}

export class DrawAndGuess
{
    private players: Map<number, Player>
    private painter: Player|null
    private beginner: Player|null
    private success: Set<number>
    private state: GameState
    private readonly emitter: Emitter
    private timer: NodeJS.Timeout|null
    private timer_time: number
    private puzzle: Puzzle

    constructor(emitter: Emitter) {
        this.players = new Map()
        this.emitter = emitter
        this.painter = null
        this.beginner = null
        this.success = new Set()
        this.state = GameState.Wait
        this.timer = null
        this.timer_time = 0
        this.puzzle = {word: '', hint: ''}
    }

    emit(type: string, data?: any) {
        this.emitter.emit(0, type, data)
    }

    update_all() {
        const data = {
            state: {
                wait: this.state === GameState.Wait,
                select: this.state === GameState.Select,
                draw: this.state === GameState.Draw,
                timeout: this.timer_time,
                hint: `${this.puzzle.word.length}字 ${this.puzzle.hint}`,
                answer: ''
            },
            players: [] as {name: string, point: number, online: boolean, action: boolean, success: boolean}[]
        }
        this.players.forEach(player => {
            data.players.push({
                ...player.info(),
                action: player === this.painter,
                success: this.success.has(player.token)
            })
        })
        this.players.forEach(player => {
            if (this.state === GameState.Draw && player === this.painter) {
                data.state.answer = this.puzzle.word
            } else {
                data.state.answer = ''
            }
            player.emit('update-all', data)
        })
    }

    validate(player: Player) {
        return this.players.has(player.token)
    }

    join(player: Player) {
        if (this.players.has(player.token)) {
            const p = this.players.get(player.token)
            if (p)
                player = p
        } else {
            let fp = this.players.values().next()
            if (!fp.done)
                fp.value.get_prev().attach(player)
            this.players.set(player.token, player)
        }
        player.set_online()
        this.update_all()
        return player
    }

    leave(player: Player) {
        if (!this.validate(player))
            return
        player.set_offline()
        if (this.state === GameState.Wait) {
            this.players.delete(player.token)
            player.detach()
        } else if (this.state === GameState.Select) {
            if (player === this.painter)
                this.next_round()
        }
        this.update_all()
    }

    start() {
        if (this.state !== GameState.Wait || this.players.size < 2)
            return
        // Game Begin
        this.reset()
        this.emit('start')
        this.next_round()
        this.update_all()
    }

    private next_round() {
        let p:Player|null = null
        if (this.beginner && this.painter) {
            p = this.painter.get_next()
            while (p !== this.beginner) {
                if (p.get_online())
                    break
                p = p.get_next()
            }
            if (p === this.beginner)
                p = null
        } else {
            this.players.forEach(player => {
                if (p === null && player.get_online())
                    p = player
            })
            this.beginner = p
        }
        if (this.painter && this.state === GameState.Draw) {
            // Round End
            const success: string[] = []
            this.success.forEach(i => {
                const name = this.players.get(i)?.name
                if (name)
                    success.push(name)
            })
            this.emit('round-done', {success, answer: this.puzzle.word})
            this.painter.add_point(this.success.size < this.players.size - 1 ? this.success.size * 2 : 0)
        }
        if (p) {
            // Round Begin
            // Select Begin
            this.painter = p
            this.state = GameState.Select
            this.success.clear()
            this.painter.emit('selections', random_puzzles(6).map(id => ({id, word: get_puzzle_info(id).word})))
            this.reset_timer(40)
        } else {
            this.end()
        }
    }

    select(player: Player, id: number) {
        if (!this.validate(player) || this.painter !== player || this.state !== GameState.Select || isNaN(id))
            return
        const p = get_puzzle_info(id)
        if (!p)
            return
        // Draw Begin
        this.puzzle = p
        this.state = GameState.Draw
        this.reset_timer(80)
        this.update_all()
    }

    answer(player: Player, msg: string) {
        if (!this.validate(player) || this.painter === player || !msg)
            return
        if (this.state === GameState.Draw) {
            if (msg === this.puzzle.word) {
                player.emit('bingo')
                if (!this.success.has(player.token)) {
                    this.success.add(player.token)
                    player.add_point(this.players.size - this.success.size + (this.success.size === 1 ? 1 : 0))
                    if (this.success.size === this.players.size - 1) {
                        this.next_round()
                    } else if (this.success.size === this.players.size - 2 && this.timer_time > (new Date()).getTime() / 1000 + 10) {
                        this.reset_timer(10)
                        this.emit('speedup')
                    }
                    this.update_all()
                }
            } else
                player.chat(msg)
        } else
            player.chat(msg)
    }

    private end() {
        // Game End
        this.update_all()
        this.emit('end')
        this.reset()
    }

    private reset_timer(elapse: number) {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer_time = 0
        }
        this.timer = elapse < 0 ? null : setTimeout(() => this.timeout(), elapse * 1000)
        this.timer_time = elapse < 0 ? 0 : (new Date()).getTime() / 1000 + elapse
    }

    private timeout() {
        this.timer = null
        this.timer_time = 0
        if (this.state === GameState.Select) {
            this.next_round()
        } else if (this.state === GameState.Draw) {
            this.next_round()
        }
        this.update_all()
    }

    force_reset() {
        this.reset()
        this.update_all()
    }

    private reset() {
        this.state = GameState.Wait
        this.painter = null
        this.beginner = null
        this.success = new Set()
        this.puzzle = {word: '', hint: ''}
        this.reset_timer(-1)
        const to_leave: Player[] = []
        this.players.forEach(player => {
            if (!player.get_online())
                to_leave.push(player)
            else
                player.reset_point()
        })
        for (let player of to_leave) {
            this.leave(player)
        }
    }
}