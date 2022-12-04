import {add_puzzle, sync_puzzle} from "./puzzles";
import {readFileSync} from 'fs'

const data = readFileSync('plain.txt').toString().split('\n')
for (const i of data) {
    add_puzzle({word: i, hint: '学科'})
}
sync_puzzle()
