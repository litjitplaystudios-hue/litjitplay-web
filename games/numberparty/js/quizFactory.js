import { PrimaryType, Block, Line, Mini1Quiz } from './quiz.js';

// Enum iteration order must match C# enum declaration order so probability
// buckets accumulate identically to Mini1QuizFactory.cs.
const PRIMARY_ORDER = [
  ['num', PrimaryType.Num],
  ['inv', PrimaryType.Inv],
  ['wrd', PrimaryType.Wrd],
  ['dic', PrimaryType.Dic],
  ['fiv', PrimaryType.Fiv],
  ['rom', PrimaryType.Rom],
  ['clk', PrimaryType.Clk],
];

const TERTIARY_ORDER = [
  ['sin', 1],
  ['dou', 2],
  ['tri', 3],
];

export class Mini1QuizFactory {
  constructor(lvData, rng = () => this._rng()) {
    this._lvData = lvData;
    this._rng    = rng;
  }

  generateQuiz(lv) {
    const key = lv.toString();
    if (!this._lvData[key]) return null;
    this._lv = this._lvData[key];

    const quiz = new Mini1Quiz();
    const lineCount = this._randomTertiary();

    for (let i = 0; i < lineCount; i++) {
      const line = new Line();
      const pri0 = this._randomPrimary();
      const pri1 = this._randomBool('mul') ? this._randomPrimary() : pri0;
      const pri = [pri0, pri1];

      for (let side = 0; side < 2; side++) {
        // Range(0, 13) in Unity = 0..12 inclusive
        let no = Math.floor(this._rng() * 13);

        if (this._randomBool('duo')) {
          const no2 = Math.floor(this._rng() * (no + 1));
          no -= no2;
          line.addBlock(new Block(no2, pri[side], this._randomBool('mir')), side);
        }

        line.addBlock(new Block(no, pri[side], this._randomBool('mir')), side);
      }

      quiz.addLine(line);
    }

    return quiz;
  }

  _randomTertiary() {
    const r = this._rng();
    let acc = 0;
    for (const [key, val] of TERTIARY_ORDER) {
      if (this._lv[key] !== undefined) {
        acc += this._lv[key];
        if (r < acc) return val;
      }
    }
    return 1;
  }

  _randomPrimary() {
    const r = this._rng();
    let acc = 0;
    for (const [key, type] of PRIMARY_ORDER) {
      if (this._lv[key] !== undefined) {
        acc += this._lv[key];
        if (r < acc) return type;
      }
    }
    return PrimaryType.Num;
  }

  _randomBool(key) {
    const chance = this._lv[key];
    return chance !== undefined && this._rng() < chance;
  }
}
