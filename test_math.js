const { parse, simplify } = require('mathjs');

function isEquivalent(expr1, expr2) {
    try {
        const diff = parse(`(${expr1}) - (${expr2})`);
        const simplified = simplify(diff);
        return simplified.toString() === '0';
    } catch(e) {
        return false;
    }
}

console.log(isEquivalent('3x+2x', '5x'));
console.log(isEquivalent('x = 2', '2 = x')); // Mathjs might not parse assignments directly
