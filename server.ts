import {Server} from "socket.io";
import {Emitter} from './emitter';
import {DrawAndGuess, Player} from './game';
import {statSync} from 'fs';
import { Whiteboard } from "./whiteboard";

const game_ver = statSync('./game.ts').mtime.toLocaleString()
const puzzle_ver = statSync('./puzzles.txt').mtime.toLocaleString()
const version = `Draw And Guess\nby zzzly3<z@tanre.cn>\nGame version: ${game_ver}\nPuzzle version: ${puzzle_ver}`
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
            }
        })
    })
})

setInterval(() => emitter.send(), 10)

console.info('Server started.')
