import { Mini1QuizFactory } from './quizFactory.js';

const TIME_LIMIT   = 5;   // seconds per quiz (matches EndlessGameplayController._timeLimit)
const MAX_QUIZ     = 4;   // matches BaseGameplayController._maxQuiz
const ANSWER_DELAY = 0.3; // seconds of input lockout after each answer

export class GameController {
  constructor(lvData, rng = () => Math.random()) {
    this._factory  = new Mini1QuizFactory(lvData, rng);
    this._playing  = false;
    this._quizList = [];
    this._lvData   = lvData;

    // Duel mode — set before calling startDuelGame()
    this.isDuel        = false;
    this.duelChallenge = null;

    // View callbacks — assign before startGame()
    this.onScoreUpdate = null; // (score: number) => void
    this.onComboUpdate = null; // (combo: number) => void
    this.onTimeFill    = null; // (fill: number 0-1) => void
    this.onQuizAdded   = null; // (quiz: Mini1Quiz) => void
    this.onCorrect     = null; // (side: 0|1|2, done: bool) => void
    this.onIncorrect   = null; // (side: 0|1|2) => void
    this.onGameEnd     = null; // (result: object) => void
    this.onLevelUpdate = null; // (lv: number) => void
  }

  startGame() {
    this._lv         = 1;
    this._score      = 0;
    this._combo      = 0;
    this._countCombo = 0;
    this._bonus      = 0;
    this._life       = 1;
    this._miss       = 0;
    this._hit        = 0;
    this._timeLeft   = TIME_LIMIT + 0.7;
    this._quizList   = [];
    this._playing    = true;
    this._locked     = false;
    this._lastTime   = performance.now();

    this._generatePlay();
    this._loop();
  }

  startDuelGame(challenge) {
    this.isDuel        = true;
    this.duelChallenge = challenge;
    this.startGame();
  }

  // --- Input entry points (called by game.html event handlers) ---

  answerLeft()  { this._answer(0); } // tap left  → claim left side is heavier
  answerRight() { this._answer(1); } // tap right → claim right side is heavier
  answerSwipe() { this._answer(2); } // swipe     → claim equal/balanced
  answerMid()   { this._answer(2); } // mid tap   → claim equal/balanced

  // --- Private ---

  _loop() {
    if (!this._playing) return;
    const now = performance.now();
    const dt  = (now - this._lastTime) / 1000;
    this._lastTime = now;

    this._timeLeft -= dt;
    this.onTimeFill?.(Math.max(0, this._timeLeft) / TIME_LIMIT);

    if (this._timeLeft <= 0) {
      this._endGame();
      return;
    }
    requestAnimationFrame(() => this._loop());
  }

  _answer(side) {
    if (!this._playing || this._locked || this._quizList.length === 0) return;
    this._locked = true;
    setTimeout(() => { this._locked = false; }, ANSWER_DELAY * 1000);
    if (this._quizList[0].checkAnswer(side)) {
      this._onCorrect(side);
    } else {
      this._onIncorrect(side);
    }
  }

  _onCorrect(side) {
    const done = this._quizList[0].next();

    this._hit++;
    this._score++;
    this._countCombo++;

    if (done) {
      this._quizList.shift();
      this._timeLeft = TIME_LIMIT; // reset timer on quiz completion
      this._score++;               // bonus point for completing the quiz
    }

    this.onCorrect?.(side, done);
    this.onScoreUpdate?.(this._score);
    this.onComboUpdate?.(this._countCombo);

    if (this._quizList.length === 0) {
      // All 4 quizzes in this wave done → refill
      if (this._lvData[(this._lv + 1).toString()]) this._lv++;
      this.onLevelUpdate?.(this._lv);
      this._generatePlay();
    }
  }

  _onIncorrect(side) {
    this._life--;
    this._miss++;
    if (this._countCombo > this._combo) this._combo = this._countCombo;
    this._countCombo = 0;

    this.onIncorrect?.(side);

    if (this._life <= 0) this._endGame();
  }

  _endGame() {
    this._playing = false;
    if (this._countCombo > this._combo) this._combo = this._countCombo;

    const result = {
      score:         this._score,
      combo:         this._combo,
      bonus:         this._bonus,
      isDuel:        this.isDuel,
      duelChallenge: this.duelChallenge,
    };

    this.isDuel        = false;
    this.duelChallenge = null;

    this.onGameEnd?.(result);
  }

  _generatePlay() {
    while (this._quizList.length < MAX_QUIZ) {
      const quiz = this._factory.generateQuiz(this._lv);
      if (!quiz) break;
      this._quizList.push(quiz);
      this.onQuizAdded?.(quiz);
    }
  }
}
