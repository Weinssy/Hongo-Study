const fs = require('fs');
const wk = require('wanakana');

let data = fs.readFileSync('js/quiz-data.js', 'utf8');

data = data.replace(/{ q: "([^"]+)", r: "([^"]+)", a: "([^"]+)" }/g, (match, q, r, a) => {
    let furigana = r.replace(/-/g, '').replace(/oo/g, 'ou').replace(/ee/g, 'ei');
    let hira = wk.toHiragana(furigana);
    return `{ q: "${q}", r: "${r}", f: "${hira}", a: "${a}" }`;
});

fs.writeFileSync('js/quiz-data.js', data);
console.log('Furigana added!');
