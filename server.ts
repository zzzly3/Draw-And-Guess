import {Server} from "socket.io";
import {Emitter} from './emitter';
import {DrawAndGuess, Player} from './game';
import {statSync} from 'fs';
import { Whiteboard } from "./whiteboard";
import { reload_puzzles } from "./puzzles";

function get_version() {
    const server_ver = statSync('./game.ts').mtime.toLocaleString()
    const client_ver = statSync('./webapp/src/pages/Index.vue').mtime.toLocaleString()
    const puzzle_ver = statSync('./puzzles.txt').mtime.toLocaleString()
    return `Draw And Guess\nby zzzly3<z@tanre.cn>\nServer version: ${server_ver}\nUI version: ${client_ver}\nPuzzle version: ${puzzle_ver}`
}

let version = get_version()
console.log(version)

const io = new Server(3000)
const emitter = new Emitter(io)
const whiteboard = new Whiteboard(emitter)
const game = new DrawAndGuess(emitter, whiteboard)

io.on("connection", socket => {
    socket.on('guest-login', () => {
        const token = ((new Date()).getTime() % 1000000) * 1000 + Math.floor(Math.random() * 1000)
        console.log('(connect)', token, 'guest')
        emitter.join(token, socket)
        emitter.set_guest(token)
        game.update_all()
        whiteboard.send_actions(token)
        socket.on('disconnect', () => {
            if (emitter.validate(token, socket)) {
                emitter.leave(token)
            }
        })
    })
    socket.on('login', ({token, name}: {token: number, name: string}) => {
        console.log('(connect)', token, name)
        if (!token || !name)
            return
        name = name.trim()
        if (name.length < 2 || name.length > 9)
            return
        emitter.join(token, socket)
        let player = new Player(token, name, emitter)
        player = game.join(player)
        socket.on('start', () => {
            game.start()
        })
        socket.on('select', ({id, custom}: {id: number, custom: string}) => {
            id = Number(id)
            custom = String(custom)
            game.select(player, id, custom)
        })
        socket.on('answer', (msg: string) => {
            msg = String(msg)
            game.answer(player, msg)
        })
        socket.on('seticon', (icon: string) => {
            player.update_icon(String(icon))
        })
        socket.on('draw', (data: {type: string, points: [number, number][]}) => {
            whiteboard.add_action(player.token, {type: data.type, points: data.points})
        })
        socket.on('disconnect', () => {
            if (emitter.validate(player.token, socket)) {
                game.leave(player)
                emitter.leave(player.token)
            }
        })
        socket.on('command', (data: string) => {
            console.log(player.name, data)
            const cmd = data.split(' ')
            switch (cmd[0]) {
                case 'force-reset':
                    game.force_reset()
                    break
                case 'version':
                    player.notify(version)
                    break
                case 'give-credit':
                    if (Number(cmd[1]) > 0)
                        player.give_credit(Number(cmd[1]))
                    break
                case 'reload-puzzles':
                    reload_puzzles()
                    version = get_version()
                    player.notify(version)
                    break
            }
        })
    })
})

setInterval(() => emitter.send(), 10)

console.info('Server started.')
