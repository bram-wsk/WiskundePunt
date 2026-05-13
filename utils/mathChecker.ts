import { parse, simplify } from 'mathjs';

// Convert our custom math formats (like 3x rather than 3*x) into mathjs compatible string, though mathjs is usually smart.
function sanitizeForMathjs(expr: string): string {
    if (!expr) return '0';
    let clean = expr.replace(/\\cdot/g, '*');
    clean = clean.replace(/\\times/g, '*');
    clean = clean.replace(/\\div/g, '/');
    clean = clean.replace(/:/g, '/');
    clean = clean.replace(/,/g, '.'); // decimals
    return clean;
}

export function isAlgebraicallyEquivalent(userExpr: string, expectedExpr: string): boolean {
    if (!userExpr && !expectedExpr) return true;
    if (!userExpr || !expectedExpr) return false;

    // Normal string check first
    if (userExpr.trim() === expectedExpr.trim()) return true;

    try {
        const u = sanitizeForMathjs(userExpr);
        const e = sanitizeForMathjs(expectedExpr);
        
        // Check if (u) - (e) == 0
        const diff = parse(`(${u}) - (${e})`);
        const sim = simplify(diff);
        return sim.toString() === '0';
    } catch (err) {
        console.warn("Mathjs kon expressie niet simplificeren:", err);
        return false;
    }
}
