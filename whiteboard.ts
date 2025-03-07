import {Emitter} from './emitter';

export class Whiteboard
{
    private actions: {type: string, points: [number, number][]}[]
    private readonly emitter: Emitter
    constructor(emitter: Emitter) {
        this.emitter = emitter
        this.actions = []
    }
    clear() {
        this.actions = []
        this.emitter.emit(0, 'draw', {from: 0, type: 'clear', points: []})
    }
    add_action(actor: string, action: {type: string, points: [number, number][]}) {
        if (action.type === 'clear') {
            this.actions = []
        } else {
            this.actions.push(action)
        }
        this.emitter.emit(0, 'draw', {from: actor, type: action.type, points: action.points})
    }
    send_actions(target: number) {
        for (let action of this.actions) {
            this.emitter.emit(target, 'draw', {from: '', type: action.type, points: action.points})
        }
    }
}