import * as fs from 'fs';

export interface Puzzle {
    word: string
    hint: string
}

const puzzles: Puzzle[] = []

const data = fs.readFileSync('puzzles.txt')
const lines = data.toString().split('\n')
for (let line of lines) {
    const a = line.split(',')
    if (a.length === 2)
        puzzles.push({word: a[0], hint: a[1]})
}

export function get_puzzle_info(id: number) {
    return puzzles[id]
}

export function random_puzzles(n: number) {
    const id: number[] = []
    if (n < 10) {
        for (let i = 0; i < n; ) {
            const j = Math.floor(Math.random() * puzzles.length)
            if (id.indexOf(j) === -1) {
                id.push(j)
                i++
            }
        }
    }
    return id
}
