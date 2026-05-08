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
const TOTAL_ROUNDS = 10;
const MIN_CARD = 1;
const MAX_CARD = 13;


//==============================================================================
// 선택 버튼.
//==============================================================================
class HLButton extends WorldNode {
	/** @type { string } */ choice;
	/** @private @type { HighLowPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	//==============================================================================
	// constructor.
	//==============================================================================
	/**
	 * @param { * } part
	 * @param { * } choice
	 * @param { * } text
	 */
	constructor(part, choice, text) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.choice = choice;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#text = this.addComponent(Text);
		this.#text.setText(text);
		this.#text.setFontSize(64);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.refreshAppearance();
	}

	//==============================================================================
	// refreshAppearance.
	//==============================================================================
	refreshAppearance() {
		const isHigh = this.choice === "high";
		this.#paint.setColor(Color.createFromHEX(isHigh ? "#22c55e" : "#ef4444"));
		this.#text.setTextColor(Color.createFromHEX("#ffffff"));
	}

	//==============================================================================
	// setFontSize.
	//==============================================================================
	/**
	 * @param { * } size
	 */
	setFontSize(size) { this.#text.setFontSize(size); }

	//==============================================================================
	// touchRelease.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onChoice(this.choice);
	}
}


//==============================================================================
// 하이로우 파트.
//==============================================================================
export class HighLowPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #cardNode;
	/** @private @type { Paint } */ #cardPaint;
	/** @private @type { Text } */ #cardText;
	/** @private @type { WorldNode } */ #resultTextNode;
	/** @private @type { Text } */ #resultText;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { HLButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #current;
	/** @private @type { number } */ #round;
	/** @private @type { number } */ #correctCount;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.#buttons = [];
		this.#current = 7;
		this.#round = 0;
		this.#correctCount = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.highLow; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "하이로우"; }
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

		this.#cardNode = new WorldNode();
		this.#cardNode.setPivot(Pivot.middleCenter);
		this.#cardNode.setAnchor(Pivot.topLeft);
		this.#cardPaint = this.#cardNode.addComponent(Paint);
		this.#cardPaint.setRoundSize(24);
		this.#cardText = this.#cardNode.addComponent(Text);
		this.#cardText.setText("");
		this.#cardText.setFontSize(220);
		this.#cardText.setTextAlign("center");
		this.#cardText.setTextBaseline("middle");
		this.addChild(this.#cardNode);

		this.#resultTextNode = this.makeText(48);
		this.addChild(this.#resultTextNode);
		this.#resultText = this.#resultTextNode.getComponent(Text);

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		this.#buttons.push(new HLButton(this, "low", "낮음 ↓"));
		this.#buttons.push(new HLButton(this, "high", "높음 ↑"));
		for (const b of this.#buttons) this.#buttonsNode.addChild(b);

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
	 * @param { * } size
	 */
	makeText(size) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const text = node.addComponent(Text);
		text.setFontSize(size);
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
		if (this.#cardPaint) {
			this.#cardPaint.setColor(Color.createFromHEX(theme.surface));
		}
		if (this.#cardText) {
			this.#cardText.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		if (this.#resultText) {
			this.#resultText.setTextColor(Color.createFromHEX(theme.onBackground));
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
		this.#current = MIN_CARD + System.Math.floor(System.Math.random() * (MAX_CARD - MIN_CARD + 1));
		this.#round = 0;
		this.#correctCount = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.#cardText.setText(String(this.#current));
		this.#resultText.setText("다음 카드는?");
		this.refreshInfo();
	}

	//==============================================================================
	// refreshInfo.
	//==============================================================================
	refreshInfo() {
		this.#infoText.setText(`라운드 ${this.#round}/${TOTAL_ROUNDS}    정답 ${this.#correctCount}`);
	}

	//==============================================================================
	// onChoice.
	//==============================================================================
	/**
	 * @param { * } choice
	 */
	onChoice(choice) {
		if (this.#isGameOver) {
			return;
		}		let next = MIN_CARD + System.Math.floor(System.Math.random() * (MAX_CARD - MIN_CARD + 1));
		while (next === this.#current) {
			next = MIN_CARD + System.Math.floor(System.Math.random() * (MAX_CARD - MIN_CARD + 1));
		}
		const theme = getCurrentGameTheme();
		const correct = (choice === "high" && next > this.#current) || (choice === "low" && next < this.#current);
		this.#cardText.setText(String(next));
		if (correct) {
			this.#correctCount += 1;
			this.#resultText.setText(`정답! (${this.#current} → ${next})`);
			this.#resultText.setTextColor(Color.createFromHEX(theme.primary));
		}
		else {
			this.#resultText.setText(`오답 (${this.#current} → ${next})`);
			this.#resultText.setTextColor(Color.createFromHEX(theme.error));
		}
		this.#current = next;
		this.#round += 1;
		this.refreshInfo();
		if (this.#round >= TOTAL_ROUNDS) {
			this.endGame();
		}
	}

	//==============================================================================
	// layout.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 16;
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - gap) / 2);
		const buttonH = 200;

		const infoH = 60;
		const cardH = 360;
		const cardW = 360;
		const resultH = 80;
		const resetH = 120;
		const vGap = 28;
		const totalH = infoH + vGap + cardH + vGap + resultH + vGap + buttonH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#cardNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + cardH * 0.5));
		this.#cardNode.setContentSize(Vector2.create(cardW, cardH));
		cy += cardH + vGap;
		this.#resultTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
		cy += resultH + vGap;
		const btnX = (contentSize.x - (buttonW * 2 + gap)) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(btnX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(buttonW * 2 + gap, buttonH));
		for (let i = 0; i < this.#buttons.length; ++i) {
			this.#buttons[i].setLocalPosition(Vector2.create(i * (buttonW + gap), 0));
			this.#buttons[i].setContentSize(Vector2.create(buttonW, buttonH));
			this.#buttons[i].setFontSize(72);
		}
		cy += buttonH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	//==============================================================================
	// endGame.
	//==============================================================================
	endGame() {
		this.#isGameOver = true;
		const score = this.#correctCount * 100;
		const isWon = this.#correctCount >= 6;
		const app = this.getApp();
		app.showResult({
			isWon,
			title: isWon ? "잘했어요!" : "아쉬워요",
			score,
			stats: [
				`정답: ${this.#correctCount}/${TOTAL_ROUNDS}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
