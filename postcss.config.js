// 브레이크포인트 정본은 src/styles/tokens.css 의 @custom-media 다.
// global-data 가 그 정의를 모든 CSS 파일에 공급하고, custom-media 가
// 빌드 때 실제 미디어쿼리로 풀어 준다 — "CSS 는 미디어쿼리에 변수를
// 못 쓴다" 는 한계를 빌드 단계에서 해소한 것.
const globalData = require('@csstools/postcss-global-data')
const customMedia = require('postcss-custom-media')

module.exports = {
  plugins: [
    globalData({ files: ['src/styles/tokens.css'] }),
    customMedia(),
  ],
}
