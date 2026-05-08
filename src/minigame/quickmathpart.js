//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../../libs/vanilla.js/src/core/component/paint.js";
import { Text } from "../../libs/vanilla.js/src/core/component/text.js";
import { Part, PartId } from "../part.js";
import { createButtonNode } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const GAME_DURATION = 30;
const CHOICES = 4;


//==============================================================================
// 답 버튼.
//==============================================================================
class AnswerButton extends WorldNode {
	/** @type { number } */ value;
	/** @private @type { QuickMathPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	constructor(part) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.value = 0;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#text = this.addComponent(Text);
		this.#text.setText("");
		this.#text.setFontSize(72);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.refreshAppearance();
	}

	setValue(v) {
		this.value = v;
		this.#text.setText(String(v));
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
		this.#text.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
	}

	setFontSize(size) { this.#text.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onAnswer(this.value);
	}
}


//==============================================================================
// 빠른계산 파트.
//==============================================================================
export class QuickMathPart extends Part {
	/** @private @type { WorldNode } */ #questionTextNode;
	/** @private @type { Text } */ #questionText;
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { AnswerButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #correctCount;
	/** @private @type { number } */ #wrongCount;
	/** @private @type { number } */ #correctAnswer;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#buttons = [];
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#correctAnswer = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.quickMath; }
	getNavigationTitle() { return "빠른계산"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoTextNode = new WorldNode();
		this.#infoTextNode.setPivot(Pivot.middleCenter);
		this.#infoTextNode.setAnchor(Pivot.topLeft);
		this.#infoText = this.#infoTextNode.addComponent(Text);
		this.#infoText.setFontSize(40);
		this.#infoText.setTextAlign("center");
		this.#infoText.setTextBaseline("middle");
		this.#infoText.setText("");
		this.addChild(this.#infoTextNode);

		this.#questionTextNode = new WorldNode();
		this.#questionTextNode.setPivot(Pivot.middleCenter);
		this.#questionTextNode.setAnchor(Pivot.topLeft);
		this.#questionText = this.#questionTextNode.addComponent(Text);
		this.#questionText.setFontSize(120);
		this.#questionText.setTextAlign("center");
		this.#questionText.setTextBaseline("middle");
		this.#questionText.setText("");
		this.addChild(this.#questionTextNode);

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		for (let i = 0; i < CHOICES; ++i) {
			const b = new AnswerButton(this);
			this.#buttonsNode.addChild(b);
			this.#buttons.push(b);
		}

		this.#resetButtonNode = createButtonNode(
			"다시하기",
			Vector2.create(360, 120),
			Color.createFromHEX(getCurrentGameTheme().primary),
			Color.createFromHEX(getCurrentGameTheme().onPrimary),
			48,
			() => { this.resetGame(); },
		);
		this.#resetButtonPaint = this.#resetButtonNode.getComponent(Paint);
		this.#resetButtonText = this.#resetButtonNode.getComponent(Text);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoText) this.#infoText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#questionText) this.#questionText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonText) this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#buttons) b.refreshAppearance();
	}

	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.nextQuestion();
		this.refreshInfo();
	}

	refreshInfo() {
		const t = System.Math.ceil(this.#remainingTime);
		this.#infoText.setText(`시간: ${t}초    정답 ${this.#correctCount}    오답 ${this.#wrongCount}`);
	}

	nextQuestion() {
		const ops = ["+", "-", "×"];
		const op = ops[System.Math.floor(System.Math.random() * ops.length)];
		let a, b, ans;
		if (op === "+") {
			a = System.Math.floor(System.Math.random() * 50) + 1;
			b = System.Math.floor(System.Math.random() * 50) + 1;
			ans = a + b;
		}
		else if (op === "-") {
			a = System.Math.floor(System.Math.random() * 80) + 20;
			b = System.Math.floor(System.Math.random() * a);
			ans = a - b;
		}
		else {
			a = System.Math.floor(System.Math.random() * 11) + 2;
			b = System.Math.floor(System.Math.random() * 11) + 2;
			ans = a * b;
		}
		this.#correctAnswer = ans;
		this.#questionText.setText(`${a} ${op} ${b} = ?`);

		// 4지선다 (정답 + 오답 3개).
		const choices = new System.Set([ans]);
		while (choices.size < CHOICES) {
			let off = System.Math.floor(System.Math.random() * 11) - 5;
			if (off === 0) off = 1;
			const v = ans + off;
			if (v >= 0) choices.add(v);
		}
		const arr = System.Array.from(choices);
		for (let i = arr.length - 1; i > 0; --i) {
			const j = System.Math.floor(System.Math.random() * (i + 1));
			const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
		}
		for (let i = 0; i < this.#buttons.length; ++i) {
			this.#buttons[i].setValue(arr[i]);
		}
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isStarted || this.#isGameOver) return;
		this.#remainingTime -= timeDelta;
		if (this.#remainingTime <= 0) {
			this.#remainingTime = 0;
			this.refreshInfo();
			this.endGame();
			return;
		}
		this.refreshInfo();
	}

	onAnswer(value) {
		if (this.#isGameOver) return;
		if (value === this.#correctAnswer) {
			this.#correctCount += 1;
		}
		else {
			this.#wrongCount += 1;
			this.#remainingTime = System.Math.max(0, this.#remainingTime - 2);
		}
		this.refreshInfo();
		this.nextQuestion();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 16;
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - gap) / 2);
		const buttonH = 200;
		const buttonsH = buttonH * 2 + gap;

		const infoH = 60;
		const questionH = 200;
		const resetH = 120;
		const vGap = 32;
		const totalH = infoH + vGap + questionH + vGap + buttonsH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#questionTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + questionH * 0.5));
		cy += questionH + vGap;
		const buttonsX = (contentSize.x - (buttonW * 2 + gap)) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(buttonsX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(buttonW * 2 + gap, buttonsH));
		const positions = [[0, 0], [1, 0], [0, 1], [1, 1]];
		for (let i = 0; i < this.#buttons.length; ++i) {
			const [c, r] = positions[i];
			this.#buttons[i].setLocalPosition(Vector2.create(c * (buttonW + gap), r * (buttonH + gap)));
			this.#buttons[i].setContentSize(Vector2.create(buttonW, buttonH));
			this.#buttons[i].setFontSize(80);
		}
		cy += buttonsH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const score = System.Math.max(0, this.#correctCount * 50 - this.#wrongCount * 20);
		const total = this.#correctCount + this.#wrongCount;
		const acc = total > 0 ? System.Math.round((this.#correctCount / total) * 100) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: this.#correctCount >= 10,
			title: "타임 오버!",
			score,
			stats: [
				`정답: ${this.#correctCount}`,
				`오답: ${this.#wrongCount}`,
				`정확도: ${acc}%`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
