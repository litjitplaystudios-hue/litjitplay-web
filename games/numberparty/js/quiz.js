export const PrimaryType = {
  Num: 1, Inv: 2, Wrd: 3, Dic: 4, Fiv: 5, Rom: 6, Clk: 7
};

export class Block {
  constructor(number, type, mirror = false) {
    this.number = number;
    this.type = type;
    this.inverse = (type === PrimaryType.Inv);
    this.mirror = mirror;
  }
  getNumber()    { return this.number; }
  getBlockType() { return this.type; }
  getInverse()   { return this.inverse; }
}

export class Line {
  constructor() {
    this.LeftBlock  = [];
    this.RightBlock = [];
    this.Answer = 2;
    this._left  = 0;
    this._right = 0;
  }

  // side: 0 = left, 1 = right
  addBlock(block, side) {
    const val = block.getInverse() ? -block.getNumber() : block.getNumber();
    if (side === 0) {
      this.LeftBlock.push(block);
      this._left += val;
    } else {
      this.RightBlock.push(block);
      this._right += val;
    }
    // 0 = left heavier, 1 = right heavier, 2 = equal
    this.Answer = this._left > this._right ? 0
                : this._left < this._right ? 1
                : 2;
  }
}

export class Mini1Quiz {
  constructor() {
    this._lines = [];
  }

  addLine(line)  { this._lines.push(line); }
  getLines()     { return this._lines; }

  checkAnswer(answer) {
    return answer === this._lines[0].Answer;
  }

  // Removes current line; returns true when quiz is fully done
  next() {
    this._lines.shift();
    return this._lines.length === 0;
  }
}
