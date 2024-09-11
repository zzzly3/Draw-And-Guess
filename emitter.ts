import {Server, Socket} from 'socket.io';

export const EMIT_TO_ALL = 0
export const EMIT_TO_PLAYER = -1
export const EMIT_TO_GUEST = -2

export class Emitter
{
    private io: Server
    private sockets: Map<number, Socket>
    private messages: {to: number, type: string, data: any}[]

    constructor(io: Server) {
        this.io = io
        this.sockets = new Map()
        this.messages = []
    }

    join(token: number, socket: Socket) {
        if (this.sockets.has(token)) {
            this.leave(token)
        }
        this.sockets.set(token, socket)
        socket.join('main')
    }

    set_guest(token: number) {
        this.sockets.get(token)?.join('guest')
    }

    leave(token: number) {
        if (this.sockets.has(token)) {
            this.sockets.get(token)?.disconnect(true)
            this.sockets.delete(token)
        }
    }

    validate(token: number, socket: Socket) {
        return this.sockets.get(token) === socket
    }

    send() {
        for (let msg of this.messages) {
            if (msg.to > 0) {
                this.sockets.get(msg.to)?.emit(msg.type, msg.data)
            } else {
                switch (msg.to) {
                    case EMIT_TO_ALL:
                        this.io.to('main').emit(msg.type, msg.data)
                        break
                    case EMIT_TO_PLAYER:
                        this.io.to('main').except('guest').emit(msg.type, msg.data)
                        break
                    case EMIT_TO_GUEST:
                        this.io.to('guest').emit(msg.type, msg.data)
                        break
                }
            }
        }
        this.messages = []
    }

    emit(to: number, type: string, data?: any) {
        if (data)
            data = JSON.parse(JSON.stringify(data))
        if (['start', 'end', 'join', 'leave', 'chat', 'gain-point', 'selections', 'gain-credit'].indexOf(type) > -1)
            console.log(type, data)
        if (type === 'update-all') { // remove old update-all
            this.messages = this.messages.filter(msg => msg.type !== 'update-all' || msg.to !== to)
        }
        this.messages.push({to, type, data})
    }
}