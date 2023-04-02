import {Server} from "socket.io";
import {Emitter} from './emitter';
import {DrawAndGuess, Player} from './game';
import {statSync} from 'fs';

const game_ver = statSync('./game.ts').mtime.toLocaleString()
const puzzle_ver = statSync('./puzzles.txt').mtime.toLocaleString()
const version = `Draw And Guess\nby zzzly3<z@tanre.cn>\nGame version: ${game_ver}\nPuzzle version: ${puzzle_ver}`
console.log(version)

const io = new Server(3000)
const emitter = new Emitter(io)
const game = new DrawAndGuess(emitter)

io.on("connection", socket => {
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
        socket.on('select', (id: number) => {
            id = Number(id)
            game.select(player, id)
        })
        socket.on('answer', (msg: string) => {
            msg = String(msg)
            game.answer(player, msg)
        })
        socket.on('disconnect', () => {
            if (emitter.validate(player.token, socket)) {
                game.leave(player)
                emitter.leave(player.token)
            }
        })
        socket.on('command', (cmd: string) => {
            console.log(player.name, cmd)
            switch (cmd) {
                case 'force-reset':
                    game.force_reset()
                    break
                case 'version':
                    player.notify(version)
                    break
            }
        })
    })
})

setInterval(() => emitter.send(), 10)

console.info('Server started.')
