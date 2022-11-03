import {Server} from "socket.io";
import {Emitter} from './emitter';
import {DrawAndGuess, Player} from './game';

const io = new Server(3000, {
    cors: {
        origin: '*'
    }
})
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
    })
})



setInterval(() => emitter.send(), 10)

console.info('Server started.')
