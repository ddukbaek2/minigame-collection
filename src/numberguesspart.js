//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { Part, PartId } from "./part.js";
import { createButtonNode, markUseSystemFont } from "./uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "./theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const MIN_NUMBER = 1;
const MAX_NUMBER = 100;
const MAX_GUESSES = 7;          // 7번 안에 맞히면 승리.
const KEYPAD_GAP = 10;
const KEYPAD_COLS = 3;
const KEYPAD_ROWS = 4;          // 1..9, 지움/0/입력
const BACKSPACE = "⌫";
const ENTER = "✓";


//==============================================================================
// 키패드 키 노드.
//==============================================================================
class KeypadKey extends WorldNode {
	/** @type { string } */ key;
	/** @private @type { NumberGuessPart } */ #part;
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
		this.#label.setFontSize(64);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		if (useSystemFont) {
			markUseSystemFont(this.#label);
		}
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

	setFontSize(size) {
		this.#label.setFontSize(size);
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onKeyTapped(this.key);
	}
}


//==============================================================================
// 숫자맞추기 파트.
//==============================================================================
export class NumberGuessPart extends Part {
	/** @private @type { WorldNode } */ #titleLabelNode;
	/** @private @type { Label } */ #titleLabel;
	/** @private @type { WorldNode } */ #hintLabelNode;
	/** @private @type { Label } */ #hintLabel;
	/** @private @type { WorldNode } */ #inputLabelNode;
	/** @private @type { Label } */ #inputLabel;
	/** @private @type { WorldNode } */ #rangeLabelNode;
	/** @private @type { Label } */ #rangeLabel;
	/** @private @type { WorldNode } */ #keypadNode;
	/** @private @type { KeypadKey[] } */ #keys;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #target;
	/** @private @type { number } */ #lowerBound;
	/** @private @type { number } */ #upperBound;
	/** @private @type { string } */ #currentInput;
	/** @private @type { number } */ #guessCount;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#keys = [];
		this.#target = 0;
		this.#lowerBound = MIN_NUMBER;
		this.#upperBound = MAX_NUMBER;
		this.#currentInput = "";
		this.#guessCount = 0;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.numberGuess; }
	getNavigationTitle() { return "숫자맞추기"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() {
		return this.#guessCount > 0 && !this.#isGameOver;
	}
	getExitConfirmMessage() {
		return "현재 게임을 그만두시겠습니까?";
	}

	onBuild() {
		this.setupBackground();

		this.#titleLabelNode = new WorldNode();
		this.#titleLabelNode.setPivot(Pivot.middleCenter);
		this.#titleLabelNode.setAnchor(Pivot.topLeft);
		this.#titleLabel = this.#titleLabelNode.addComponent(Label);
		this.#titleLabel.setFontSize(40);
		this.#titleLabel.setTextAlign("center");
		this.#titleLabel.setTextBaseline("middle");
		this.#titleLabel.setText("");
		this.addChild(this.#titleLabelNode);

		this.#hintLabelNode = new WorldNode();
		this.#hintLabelNode.setPivot(Pivot.middleCenter);
		this.#hintLabelNode.setAnchor(Pivot.topLeft);
		this.#hintLabel = this.#hintLabelNode.addComponent(Label);
		this.#hintLabel.setFontSize(56);
		this.#hintLabel.setTextAlign("center");
		this.#hintLabel.setTextBaseline("middle");
		this.#hintLabel.setText("");
		this.addChild(this.#hintLabelNode);

		this.#rangeLabelNode = new WorldNode();
		this.#rangeLabelNode.setPivot(Pivot.middleCenter);
		this.#rangeLabelNode.setAnchor(Pivot.topLeft);
		this.#rangeLabel = this.#rangeLabelNode.addComponent(Label);
		this.#rangeLabel.setFontSize(36);
		this.#rangeLabel.setTextAlign("center");
		this.#rangeLabel.setTextBaseline("middle");
		this.#rangeLabel.setText("");
		this.addChild(this.#rangeLabelNode);

		this.#inputLabelNode = new WorldNode();
		this.#inputLabelNode.setPivot(Pivot.middleCenter);
		this.#inputLabelNode.setAnchor(Pivot.topLeft);
		this.#inputLabel = this.#inputLabelNode.addComponent(Label);
		this.#inputLabel.setFontSize(120);
		this.#inputLabel.setTextAlign("center");
		this.#inputLabel.setTextBaseline("middle");
		this.#inputLabel.setText("");
		this.addChild(this.#inputLabelNode);

		this.#keypadNode = new WorldNode();
		this.#keypadNode.setPivot(Pivot.topLeft);
		this.#keypadNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#keypadNode);

		// 1..9 → 0,⌫,✓ 배치는 layout 에서. 여기서는 키만 만든다.
		const keyOrder = ["1", "2", "3", "4", "5", "6", "7", "8", "9", BACKSPACE, "0", ENTER];
		for (const k of keyOrder) {
			const useSystemFont = (k === BACKSPACE || k === ENTER);
			const key = new KeypadKey(this, k, useSystemFont);
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

	enter() {
		this.resetGame();
		this.layout();
	}

	onResize() {
		this.layout();
	}

	applyTheme(theme) {
	}

	applyGameTheme(theme) {
		const backgroundPaint = this.getBackgroundPaint();
		if (backgroundPaint) {
			backgroundPaint.setColor(Color.createFromHEX(theme.background));
		}
		if (this.#titleLabel) this.#titleLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#rangeLabel) this.#rangeLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		if (this.#inputLabel) this.#inputLabel.setTextColor(Color.createFromHEX(theme.primary));
		if (this.#hintLabel) {
			// 힌트 색은 상황에 따라 (refreshHintLabel 에서 다시 갱신).
			this.#hintLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const key of this.#keys) {
			key.refreshAppearance();
		}
	}

	resetGame() {
		this.#target = MIN_NUMBER + System.Math.floor(System.Math.random() * (MAX_NUMBER - MIN_NUMBER + 1));
		this.#lowerBound = MIN_NUMBER;
		this.#upperBound = MAX_NUMBER;
		this.#currentInput = "";
		this.#guessCount = 0;
		this.#isGameOver = false;
		this.#hintLabel.setText("아무 숫자나 입력해 보세요");
		const theme = getCurrentGameTheme();
		this.#hintLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		this.refreshTitleLabel();
		this.refreshRangeLabel();
		this.refreshInputLabel();
	}

	refreshTitleLabel() {
		const remaining = MAX_GUESSES - this.#guessCount;
		this.#titleLabel.setText(`${MIN_NUMBER}~${MAX_NUMBER} 중 하나를 맞히세요  (남은 기회: ${remaining})`);
	}

	refreshRangeLabel() {
		this.#rangeLabel.setText(`현재 범위: ${this.#lowerBound} ~ ${this.#upperBound}`);
	}

	refreshInputLabel() {
		this.#inputLabel.setText(this.#currentInput === "" ? "_" : this.#currentInput);
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 60;
		const availableWidth = contentSize.x - margin * 2;

		// 키패드 크기.
		const keySize = System.Math.floor((availableWidth - KEYPAD_GAP * (KEYPAD_COLS - 1)) / KEYPAD_COLS);
		const keypadWidth = keySize * KEYPAD_COLS + KEYPAD_GAP * (KEYPAD_COLS - 1);
		const keypadHeight = keySize * KEYPAD_ROWS + KEYPAD_GAP * (KEYPAD_ROWS - 1);

		const titleHeight = 60;
		const rangeHeight = 50;
		const hintHeight = 80;
		const inputHeight = 140;
		const buttonHeight = 120;
		const verticalGap = 24;
		const totalHeight = titleHeight + verticalGap + rangeHeight + verticalGap + inputHeight + verticalGap + hintHeight + verticalGap + keypadHeight + verticalGap + buttonHeight;
		const top = System.Math.max((contentSize.y - totalHeight) * 0.5, 0);

		let cursorY = top;
		this.#titleLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cursorY + titleHeight * 0.5));
		cursorY += titleHeight + verticalGap;
		this.#rangeLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cursorY + rangeHeight * 0.5));
		cursorY += rangeHeight + verticalGap;
		this.#inputLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cursorY + inputHeight * 0.5));
		cursorY += inputHeight + verticalGap;
		this.#hintLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cursorY + hintHeight * 0.5));
		cursorY += hintHeight + verticalGap;

		const keypadX = (contentSize.x - keypadWidth) * 0.5;
		const keypadY = cursorY;
		this.#keypadNode.setLocalPosition(Vector2.create(keypadX, keypadY));
		this.#keypadNode.setContentSize(Vector2.create(keypadWidth, keypadHeight));

		const keyFontSize = System.Math.floor(keySize * 0.5);
		for (let i = 0; i < this.#keys.length; ++i) {
			const key = this.#keys[i];
			const row = System.Math.floor(i / KEYPAD_COLS);
			const col = i % KEYPAD_COLS;
			key.setLocalPosition(Vector2.create(col * (keySize + KEYPAD_GAP), row * (keySize + KEYPAD_GAP)));
			key.setContentSize(Vector2.create(keySize, keySize));
			key.setFontSize(keyFontSize);
		}

		cursorY += keypadHeight + verticalGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cursorY + buttonHeight * 0.5));
	}

	onKeyTapped(key) {
		if (this.#isGameOver) return;
		if (key === BACKSPACE) {
			if (this.#currentInput.length > 0) {
				this.#currentInput = this.#currentInput.slice(0, -1);
				this.refreshInputLabel();
			}
			return;
		}
		if (key === ENTER) {
			this.submitGuess();
			return;
		}
		// 숫자.
		if (this.#currentInput.length >= 3) return;
		// 선행 0 방지.
		if (this.#currentInput === "" && key === "0") return;
		this.#currentInput += key;
		this.refreshInputLabel();
	}

	submitGuess() {
		if (this.#currentInput === "") return;
		const value = System.Number.parseInt(this.#currentInput, 10);
		const theme = getCurrentGameTheme();
		if (System.Number.isNaN(value) || value < MIN_NUMBER || value > MAX_NUMBER) {
			this.#hintLabel.setText(`${MIN_NUMBER}~${MAX_NUMBER} 사이의 숫자만`);
			this.#hintLabel.setTextColor(Color.createFromHEX(theme.error));
			this.#currentInput = "";
			this.refreshInputLabel();
			return;
		}
		this.#guessCount += 1;
		this.#currentInput = "";
		this.refreshInputLabel();

		if (value === this.#target) {
			this.#hintLabel.setText("정답!");
			this.#hintLabel.setTextColor(Color.createFromHEX(theme.primary));
			this.refreshTitleLabel();
			this.endGame(true);
			return;
		}
		if (value < this.#target) {
			this.#hintLabel.setText(`${value} 보다 큽니다 ↑`);
			this.#hintLabel.setTextColor(Color.createFromHEX(theme.onBackground));
			if (value >= this.#lowerBound) this.#lowerBound = value + 1;
		}
		else {
			this.#hintLabel.setText(`${value} 보다 작습니다 ↓`);
			this.#hintLabel.setTextColor(Color.createFromHEX(theme.onBackground));
			if (value <= this.#upperBound) this.#upperBound = value - 1;
		}
		this.refreshRangeLabel();
		this.refreshTitleLabel();

		if (this.#guessCount >= MAX_GUESSES) {
			this.#hintLabel.setText(`기회 소진! 정답: ${this.#target}`);
			this.#hintLabel.setTextColor(Color.createFromHEX(theme.error));
			this.endGame(false);
		}
	}

	endGame(isWon) {
		this.#isGameOver = true;
		// 점수: 적은 시도로 맞힐수록 높음. 최대 1000.
		const score = isWon ? System.Math.max(100, 1000 - (this.#guessCount - 1) * 120) : 0;
		const app = this.getApp();
		app.showResult({
			isWon,
			title: isWon ? "정답!" : "실패",
			score,
			stats: [
				`정답: ${this.#target}`,
				`시도 횟수: ${this.#guessCount} / ${MAX_GUESSES}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
