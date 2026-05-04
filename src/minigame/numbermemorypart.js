//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../../libs/vanilla.js/src/core/component/label.js";
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
	/** @private @type { Label } */ #label;

	constructor(part, key, useSystemFont) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.key = key;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#label = this.addComponent(Label);
		this.#label.setText(key);
		this.#label.setFontSize(56);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		if (useSystemFont) markUseSystemFont(this.#label);
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		if (this.key === BACKSPACE) {
			this.#paint.setColor(Color.createFromHEX(theme.error));
			this.#label.setTextColor(Color.createFromHEX(theme.onError));
		}
		else if (this.key === ENTER) {
			this.#paint.setColor(Color.createFromHEX(theme.primary));
			this.#label.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		else {
			this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
			this.#label.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	setFontSize(s) { this.#label.setFontSize(s); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onKey(this.key);
	}
}


//==============================================================================
// 숫자기억 파트.
//==============================================================================
export class NumberMemoryPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #showLabelNode;
	/** @private @type { Label } */ #showLabel;
	/** @private @type { WorldNode } */ #inputLabelNode;
	/** @private @type { Label } */ #inputLabel;
	/** @private @type { WorldNode } */ #keypadNode;
	/** @private @type { NMKey[] } */ #keys;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { string } */ #target;
	/** @private @type { string } */ #input;
	/** @private @type { string } */ #state;
	/** @private @type { number } */ #showTimer;
	/** @private @type { number } */ #level;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

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

	getPartId() { return PartId.numberMemory; }
	getNavigationTitle() { return "숫자기억"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = this.makeLabel(40);
		this.addChild(this.#infoLabelNode);
		this.#infoLabel = this.#infoLabelNode.getComponent(Label);

		this.#showLabelNode = this.makeLabel(140);
		this.addChild(this.#showLabelNode);
		this.#showLabel = this.#showLabelNode.getComponent(Label);

		this.#inputLabelNode = this.makeLabel(96);
		this.addChild(this.#inputLabelNode);
		this.#inputLabel = this.#inputLabelNode.getComponent(Label);

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
		this.#resetButtonLabel = this.#resetButtonNode.getComponent(Label);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	makeLabel(s) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const label = node.addComponent(Label);
		label.setFontSize(s);
		label.setTextAlign("center");
		label.setTextBaseline("middle");
		label.setText("");
		return node;
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoLabel) this.#infoLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#showLabel) this.#showLabel.setTextColor(Color.createFromHEX(theme.primary));
		if (this.#inputLabel) this.#inputLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const k of this.#keys) k.refreshAppearance();
	}

	resetGame() {
		this.#level = 1;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.startRound();
	}

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
		this.#showLabel.setText(s);
		this.#inputLabel.setText("");
		this.refreshInfo();
	}

	refreshInfo() {
		const len = this.#target.length;
		this.#infoLabel.setText(`레벨 ${this.#level}    자릿수 ${len}`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#state === STATE_SHOWING) {
			this.#showTimer -= timeDelta;
			if (this.#showTimer <= 0) {
				this.#state = STATE_INPUT;
				this.#showLabel.setText("?");
				this.#inputLabel.setText("_");
			}
		}
	}

	onKey(key) {
		if (this.#isGameOver) return;
		if (this.#state !== STATE_INPUT) return;
		if (key === BACKSPACE) {
			if (this.#input.length > 0) {
				this.#input = this.#input.slice(0, -1);
				this.#inputLabel.setText(this.#input === "" ? "_" : this.#input);
			}
			return;
		}
		if (key === ENTER) {
			this.checkAnswer();
			return;
		}
		if (this.#input.length >= this.#target.length) return;
		this.#input += key;
		this.#inputLabel.setText(this.#input);
	}

	checkAnswer() {
		const theme = getCurrentGameTheme();
		if (this.#input === this.#target) {
			this.#level += 1;
			this.#showLabel.setText("정답!");
			this.#showLabel.setTextColor(Color.createFromHEX(theme.primary));
			System.setTimeout(() => {
				if (!this.#isGameOver) {
					this.#showLabel.setTextColor(Color.createFromHEX(theme.primary));
					this.startRound();
				}
			}, 700);
		}
		else {
			this.#showLabel.setText(this.#target);
			this.#showLabel.setTextColor(Color.createFromHEX(theme.error));
			this.endGame();
		}
	}

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
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#showLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + showH * 0.5));
		cy += showH + vGap;
		this.#inputLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + inputH * 0.5));
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
