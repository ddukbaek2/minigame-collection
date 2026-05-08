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
const SIZE = 5;
const TILE_GAP = 6;
const GAME_DURATION = 60;
const COLORS = [
	{ name: "빨강", hex: "#ef4444" },
	{ name: "파랑", hex: "#3b82f6" },
	{ name: "초록", hex: "#22c55e" },
	{ name: "노랑", hex: "#eab308" },
];
const CHOICES = 4;


//==============================================================================
// 답 버튼.
//==============================================================================
class CCButton extends WorldNode {
	/** @type { number } */ value;
	/** @private @type { ColorCountPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	//==============================================================================
	// constructor.
	//==============================================================================
	/**
	 * @param { * } part
	 */
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
		this.#text.setFontSize(64);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.refreshAppearance();
	}

	//==============================================================================
	// setValue.
	//==============================================================================
	/**
	 * @param { * } v
	 */
	setValue(v) {
		this.value = v;
		this.#text.setText(String(v));
	}

	//==============================================================================
	// refreshAppearance.
	//==============================================================================
	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
		this.#text.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
	}

	//==============================================================================
	// setFontSize.
	//==============================================================================
	/**
	 * @param { * } s
	 */
	setFontSize(s) { this.#text.setFontSize(s); }

	//==============================================================================
	// touchRelease.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onAnswer(this.value);
	}
}


//==============================================================================
// 컬러카운트 파트.
//==============================================================================
export class ColorCountPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #questionTextNode;
	/** @private @type { Text } */ #questionText;
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { WorldNode[] } */ #cells;
	/** @private @type { Paint[] } */ #cellPaints;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { CCButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #correctCount;
	/** @private @type { number } */ #wrongCount;
	/** @private @type { number } */ #correctAnswer;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.#cells = [];
		this.#cellPaints = [];
		this.#buttons = [];
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#correctAnswer = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.colorCount; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "컬러카운트"; }
	//==============================================================================
	// getNavigationBackIcon.
	//==============================================================================
	getNavigationBackIcon() { return "❌"; }

	//==============================================================================
	// shouldConfirmExit.
	//==============================================================================
	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	//==============================================================================
	// getExitConfirmMessage.
	//==============================================================================
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	//==============================================================================
	// onBuild.
	//==============================================================================
	onBuild() {
		this.setupBackground();

		this.#infoTextNode = this.makeText(40);
		this.addChild(this.#infoTextNode);
		this.#infoText = this.#infoTextNode.getComponent(Text);

		this.#questionTextNode = this.makeText(56);
		this.addChild(this.#questionTextNode);
		this.#questionText = this.#questionTextNode.getComponent(Text);

		this.#boardNode = new WorldNode();
		this.#boardNode.setPivot(Pivot.topLeft);
		this.#boardNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#boardNode);
		for (let i = 0; i < SIZE * SIZE; ++i) {
			const node = new WorldNode();
			node.setPivot(Pivot.topLeft);
			node.setAnchor(Pivot.topLeft);
			const paint = node.addComponent(Paint);
			paint.setRoundSize(8);
			this.#boardNode.addChild(node);
			this.#cells.push(node);
			this.#cellPaints.push(paint);
		}

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		for (let i = 0; i < CHOICES; ++i) {
			const b = new CCButton(this);
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

	//==============================================================================
	// makeText.
	//==============================================================================
	/**
	 * @param { * } s
	 */
	makeText(s) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const text = node.addComponent(Text);
		text.setFontSize(s);
		text.setTextAlign("center");
		text.setTextBaseline("middle");
		text.setText("");
		return node;
	}

	//==============================================================================
	// enter.
	//==============================================================================
	enter() { this.resetGame(); this.layout(); }
	//==============================================================================
	// onResize.
	//==============================================================================
	onResize() { this.layout(); }
	//==============================================================================
	// applyTheme.
	//==============================================================================
	/**
	 * @param { * } theme
	 */
	applyTheme(theme) {}

	//==============================================================================
	// applyGameTheme.
	//==============================================================================
	/**
	 * @param { * } theme
	 */
	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) {
			bg.setColor(Color.createFromHEX(theme.background));
		}
		if (this.#infoText) {
			this.#infoText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#questionText) {
			this.#questionText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resetButtonPaint) {
			this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		}
		if (this.#resetButtonText) {
			this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}		for (const b of this.#buttons) b.refreshAppearance();
	}

	//==============================================================================
	// resetGame.
	//==============================================================================
	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.nextQuestion();
		this.refreshInfo();
	}

	//==============================================================================
	// nextQuestion.
	//==============================================================================
	nextQuestion() {
		const target = COLORS[System.Math.floor(System.Math.random() * COLORS.length)];
		// 셀에 색을 무작위로 채우되 target 색이 적어도 1개는 들어가게.
		let count = 0;
		for (let i = 0; i < this.#cells.length; ++i) {
			const c = COLORS[System.Math.floor(System.Math.random() * COLORS.length)];
			this.#cellPaints[i].setColor(Color.createFromHEX(c.hex));
			if (c.name === target.name) {
				count += 1;
			}
		}
		this.#correctAnswer = count;
		this.#questionText.setText(`'${target.name}' 의 개수는?`);

		// 정답 + 오답 3개.
		const choices = new System.Set([count]);
		while (choices.size < CHOICES) {
			let off = System.Math.floor(System.Math.random() * 5) - 2;
			if (off === 0) {
				off = 1;
			}			const v = count + off;
			if (v >= 0 && v <= 25) {
				choices.add(v);
			}
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

	//==============================================================================
	// refreshInfo.
	//==============================================================================
	refreshInfo() {
		const t = System.Math.ceil(this.#remainingTime);
		this.#infoText.setText(`시간: ${t}초    정답 ${this.#correctCount}    오답 ${this.#wrongCount}`);
	}

	//==============================================================================
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isStarted || this.#isGameOver) {
			return;
		}		this.#remainingTime -= timeDelta;
		if (this.#remainingTime <= 0) {
			this.#remainingTime = 0;
			this.refreshInfo();
			this.endGame();
			return;
		}
		this.refreshInfo();
	}

	//==============================================================================
	// onAnswer.
	//==============================================================================
	/**
	 * @param { * } value
	 */
	onAnswer(value) {
		if (this.#isGameOver) {
			return;
		}
		if (value === this.#correctAnswer) {
			this.#correctCount += 1;
		}else { this.#wrongCount += 1; this.#remainingTime = System.Math.max(0, this.#remainingTime - 3); }
		this.nextQuestion();
		this.refreshInfo();
	}

	//==============================================================================
	// layout.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const availW = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availW - TILE_GAP * (SIZE - 1)) / SIZE);
		const boardSize = tileSize * SIZE + TILE_GAP * (SIZE - 1);

		const buttonGap = 16;
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - buttonGap) / 2);
		const buttonH = 140;
		const buttonsH = buttonH * 2 + buttonGap;

		const infoH = 60;
		const questionH = 80;
		const resetH = 120;
		const vGap = 24;
		const totalH = infoH + vGap + questionH + vGap + boardSize + vGap + buttonsH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#questionTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + questionH * 0.5));
		cy += questionH + vGap;
		const boardX = (contentSize.x - boardSize) * 0.5;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, cy));
		this.#boardNode.setContentSize(Vector2.create(boardSize, boardSize));
		for (let i = 0; i < this.#cells.length; ++i) {
			const r = System.Math.floor(i / SIZE);
			const c = i % SIZE;
			this.#cells[i].setLocalPosition(Vector2.create(c * (tileSize + TILE_GAP), r * (tileSize + TILE_GAP)));
			this.#cells[i].setContentSize(Vector2.create(tileSize, tileSize));
		}
		cy += boardSize + vGap;
		const btnX = (contentSize.x - (buttonW * 2 + buttonGap)) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(btnX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(buttonW * 2 + buttonGap, buttonsH));
		const positions = [[0, 0], [1, 0], [0, 1], [1, 1]];
		for (let i = 0; i < this.#buttons.length; ++i) {
			const [c, r] = positions[i];
			this.#buttons[i].setLocalPosition(Vector2.create(c * (buttonW + buttonGap), r * (buttonH + buttonGap)));
			this.#buttons[i].setContentSize(Vector2.create(buttonW, buttonH));
			this.#buttons[i].setFontSize(72);
		}
		cy += buttonsH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	//==============================================================================
	// endGame.
	//==============================================================================
	endGame() {
		this.#isGameOver = true;
		const score = System.Math.max(0, this.#correctCount * 50 - this.#wrongCount * 30);
		const total = this.#correctCount + this.#wrongCount;
		const acc = total > 0 ? System.Math.round((this.#correctCount / total) * 100) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: this.#correctCount >= 8,
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
