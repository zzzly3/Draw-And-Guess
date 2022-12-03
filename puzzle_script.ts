import {add_puzzle, sync_puzzle} from "./puzzles";
import {readFileSync} from 'fs'

const data = readFileSync('plain.txt').toString().split('\n')
for (const i of data) {
    add_puzzle({word: i, hint: '甜品'})
}
sync_puzzle()

// 虚构人物
// 交通工具
// 艺术形式
// 娱乐活动
// 表情
// 职业