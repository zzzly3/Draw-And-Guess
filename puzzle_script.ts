import * as fs from 'fs';
import {sync_puzzle, add_puzzle, count_hints} from './puzzles';

const data = fs.readFileSync('plain.txt')
const lines = data.toString().split('\n')
let hint = ''
for (let line of lines) {
    if (hint === '') {
        hint = line.trim()
    } else if (line.trim() === '') {
        hint = ''
    } else {
        add_puzzle({word: line.trim(), hint})
    }
}

console.log(count_hints())
sync_puzzle()