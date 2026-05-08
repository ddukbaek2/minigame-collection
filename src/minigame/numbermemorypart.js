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
import { createButtonNode, markUseSystemFont } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const SHOW_DURATION_BASE = 2.0;     // 보여주는 시간 기본 2초.
const SHOW_DURATION_PER_DIGIT = 0.4;
const STATE_SHOWING = "showing";
const STATE_INPUT = "input";
const STATE_RESULT = "result";
const BACKSPACE = "⌫";
const ENTER = "✓";


//==============================================================================
// 키패드 키.
//==============================================================================
class NMKey extends WorldNode {
	/** @type { string } */ key;
	/** @private @type { NumberMemoryPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	//==============================================================================
	// constructor.
	//==============================================================================
	/**
	 * @param { * } part
	 * @param { * } key
	 * @param { * } useSystemFont
	 */
	constructor(part, key, useSystemFont) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.key = key;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#text = this.addComponent(Text);
		this.#text.setText(key);
		this.#text.setFontSize(56);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		if (useSystemFont) {
			markUseSystemFont(this.#text);
		}		this.refreshAppearance();
	}

	//==============================================================================
	// refreshAppearance.
	//==============================================================================
	refreshAppearance() {
		const theme = getCurrentGameTheme();
		if (this.key === BACKSPACE) {
			this.#paint.setColor(Color.createFromHEX(theme.error));
			this.#text.setTextColor(Color.createFromHEX(theme.onError));
		}
		else if (this.key === ENTER) {
			this.#paint.setColor(Color.createFromHEX(theme.primary));
			this.#text.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		else {
			this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
			this.#text.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
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
		this.#part.onKey(this.key);
	}
}


//==============================================================================
// 숫자기억 파트.
//==============================================================================
export class NumberMemoryPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #showTextNode;
	/** @private @type { Text } */ #showText;
	/** @private @type { WorldNode } */ #inputTextNode;
	/** @private @type { Text } */ #inputText;
	/** @private @type { WorldNode } */ #keypadNode;
	/** @private @type { NMKey[] } */ #keys;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { string } */ #target;
	/** @private @type { string } */ #input;
	/** @private @type { string } */ #state;
	/** @private @type { number } */ #showTimer;
	/** @private @type { number } */ #level;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.#keys = [];
		this.#target = "";
		this.#input = "";
		this.#state = STATE_SHOWING;
		this.#showTimer = 0;
		this.#level = 1;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.numberMemory; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "숫자기억"; }
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

		this.#showTextNode = this.makeText(140);
		this.addChild(this.#showTextNode);
		this.#showText = this.#showTextNode.getComponent(Text);

		this.#inputTextNode = this.makeText(96);
		this.addChild(this.#inputTextNode);
		this.#inputText = this.#inputTextNode.getComponent(Text);

		this.#keypadNode = new WorldNode();
		this.#keypadNode.setPivot(Pivot.topLeft);
		this.#keypadNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#keypadNode);
		const order = ["1", "2", "3", "4", "5", "6", "7", "8", "9", BACKSPACE, "0", ENTER];
		for (const k of order) {
			const useSys = (k === BACKSPACE || k === ENTER);
			const key = new NMKey(this, k, useSys);
			this.#keypadNode.addChild(key);
			this.#keys.push(key);
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
		if (this.#showText) {
			this.#showText.setTextColor(Color.createFromHEX(theme.primary));
		}
		if (this.#inputText) {
			this.#inputText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resetButtonPaint) {
			this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		}
		if (this.#resetButtonText) {
			this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}		for (const k of this.#keys) k.refreshAppearance();
	}

	//==============================================================================
	// resetGame.
	//==============================================================================
	resetGame() {
		this.#level = 1;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.startRound();
	}

	//==============================================================================
	// startRound.
	//==============================================================================
	startRound() {
		const len = this.#level + 2;     // 레벨 1 = 3자리.
		let s = "";
		for (let i = 0; i < len; ++i) {
			s += String(System.Math.floor(System.Math.random() * 10));
		}
		this.#target = s;
		this.#input = "";
		this.#state = STATE_SHOWING;
		this.#showTimer = SHOW_DURATION_BASE + len * SHOW_DURATION_PER_DIGIT;
		this.#showText.setText(s);
		this.#inputText.setText("");
		this.refreshInfo();
	}

	//==============================================================================
	// refreshInfo.
	//==============================================================================
	refreshInfo() {
		const len = this.#target.length;
		this.#infoText.setText(`레벨 ${this.#level}    자릿수 ${len}`);
	}

	//==============================================================================
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#state === STATE_SHOWING) {
			this.#showTimer -= timeDelta;
			if (this.#showTimer <= 0) {
				this.#state = STATE_INPUT;
				this.#showText.setText("?");
				this.#inputText.setText("_");
			}
		}
	}

	//==============================================================================
	// onKey.
	//==============================================================================
	/**
	 * @param { * } key
	 */
	onKey(key) {
		if (this.#isGameOver) {
			return;
		}
		if (this.#state !== STATE_INPUT) {
			return;
		}
		if (key === BACKSPACE) {
			if (this.#input.length > 0) {
				this.#input = this.#input.slice(0, -1);
				this.#inputText.setText(this.#input === "" ? "_" : this.#input);
			}
			return;
		}
		if (key === ENTER) {
			this.checkAnswer();
			return;
		}
		if (this.#input.length >= this.#target.length) {
			return;
		}		this.#input += key;
		this.#inputText.setText(this.#input);
	}

	//==============================================================================
	// checkAnswer.
	//==============================================================================
	checkAnswer() {
		const theme = getCurrentGameTheme();
		if (this.#input === this.#target) {
			this.#level += 1;
			this.#showText.setText("정답!");
			this.#showText.setTextColor(Color.createFromHEX(theme.primary));
			System.setTimeout(() => {
				if (!this.#isGameOver) {
					this.#showText.setTextColor(Color.createFromHEX(theme.primary));
					this.startRound();
				}
			}, 700);
		}
		else {
			this.#showText.setText(this.#target);
			this.#showText.setTextColor(Color.createFromHEX(theme.error));
			this.endGame();
		}
	}

	//==============================================================================
	// layout.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const margin = 60;
		const availW = contentSize.x - margin * 2;
		const cols = 3, rows = 4;
		const keyGap = 10;
		const keySize = System.Math.floor((availW - keyGap * (cols - 1)) / cols);
		const keypadW = keySize * cols + keyGap * (cols - 1);
		const keypadH = keySize * rows + keyGap * (rows - 1);

		const infoH = 60;
		const showH = 200;
		const inputH = 140;
		const resetH = 120;
		const vGap = 24;
		const totalH = infoH + vGap + showH + vGap + inputH + vGap + keypadH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#showTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + showH * 0.5));
		cy += showH + vGap;
		this.#inputTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + inputH * 0.5));
		cy += inputH + vGap;
		const keypadX = (contentSize.x - keypadW) * 0.5;
		this.#keypadNode.setLocalPosition(Vector2.create(keypadX, cy));
		this.#keypadNode.setContentSize(Vector2.create(keypadW, keypadH));
		const fontSize = System.Math.floor(keySize * 0.5);
		for (let i = 0; i < this.#keys.length; ++i) {
			const r = System.Math.floor(i / cols);
			const c = i % cols;
			this.#keys[i].setLocalPosition(Vector2.create(c * (keySize + keyGap), r * (keySize + keyGap)));
			this.#keys[i].setContentSize(Vector2.create(keySize, keySize));
			this.#keys[i].setFontSize(fontSize);
		}
		cy += keypadH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	//==============================================================================
	// endGame.
	//==============================================================================
	endGame() {
		this.#isGameOver = true;
		const score = (this.#level - 1) * 100;
		const app = this.getApp();
		app.showResult({
			isWon: this.#level > 3,
			title: "실패",
			score,
			stats: [
				`최고 레벨: ${this.#level}`,
				`최대 자릿수: ${this.#level + 1}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
