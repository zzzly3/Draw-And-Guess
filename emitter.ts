import {Server, Socket} from 'socket.io';

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
            if (msg.to) {
                this.sockets.get(msg.to)?.emit(msg.type, msg.data)
            } else {
                this.io.to('main').emit(msg.type, msg.data)
            }
        }
        this.messages = []
    }

    emit(to: number, type: string, data?: any) {
        if (data)
            data = JSON.parse(JSON.stringify(data))
        if (['start', 'end', 'join', 'leave', 'chat', 'gain', 'selection'].indexOf(type) > -1)
            console.log(type, data)
        this.messages.push({to, type, data})
    }
}