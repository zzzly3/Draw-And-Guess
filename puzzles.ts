import * as fs from 'fs';

export interface Puzzle {
    word: string
    hint: string
}

let puzzles: Puzzle[] = []

export function reload_puzzles() {
    puzzles = []
    const hints_count: {[key: string]: number} = {}
    const data = fs.readFileSync('puzzles.txt')
    const lines = data.toString().split('\n')
    for (let line of lines) {
        const a = line.trim().split(',')
        if (a.length === 2) {
            puzzles.push({word: a[0], hint: a[1]})
            if (hints_count[a[1]])
                hints_count[a[1]]++
            else
                hints_count[a[1]] = 1
        }
    }
    // console.log(hints_count)
}

reload_puzzles()

export function format_variants(word: string) {
    word = word.trim().toUpperCase()
    word = word.replace('0', '零')
    word = word.replace('1', '一')
    word = word.replace('2', '二')
    word = word.replace('3', '三')
    word = word.replace('4', '四')
    word = word.replace('5', '五')
    word = word.replace('6', '六')
    word = word.replace('7', '七')
    word = word.replace('8', '八')
    word = word.replace('9', '九')
    word = word.replace(',', '，')
    word = word.replace('.', '。')
    word = word.replace('?', '？')
    word = word.replace('!', '！')
    word = word.replace(';', '；')
    word = word.replace(':', '：')
    word = word.replace('·', '.')
    return word
}

export function get_puzzle_info(id: number) {
    return id >= 0 && id < puzzles.length ? puzzles[id] : null
}

export function custom_puzzle(word: string) {
    word = word.trim()
    return word.length > 0 && word.length < 10 ? {word, hint: '<自定义>'} : null
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
    return id.map(i => ({id: i, word: puzzles[i].word}))
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