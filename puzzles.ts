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

export function add_puzzle(puzzle: Puzzle) {
    puzzle.word = puzzle.word.replace(/\s|\r/, '')
    const t = puzzles.find(i => i.word === puzzle.word)
    if (t)
        console.log('Duplicated word', t)
    else if (puzzle.word.length === 0)
        console.log('Empty word', puzzle)
    else
        puzzles.push(puzzle)
}

export function sync_puzzle() {
    puzzles.sort((a, b) => {
        if (a.hint < b.hint)
            return -1
        if (a.hint > b.hint)
            return 1
        return 0
    })
    fs.writeFileSync('puzzles.txt', puzzles.map(i => `${i.word},${i.hint}`).join('\n'))
}