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
const STARTING_CHIPS = 100;
const BET_AMOUNT = 10;
const TOTAL_ROLLS = 10;
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];


//==============================================================================
// 베팅 버튼.
//==============================================================================
class BetButton extends WorldNode {
	/** @type { string } */ choice;       // "under" / "seven" / "over"
	/** @private @type { DiceBetPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { WorldNode } */ #titleNode;
	/** @private @type { Text } */ #titleText;
	/** @private @type { WorldNode } */ #subNode;
	/** @private @type { Text } */ #subText;

	//==============================================================================
	// constructor.
	//==============================================================================
	/**
	 * @param { * } part
	 * @param { * } choice
	 * @param { * } title
	 * @param { * } sub
	 */
	constructor(part, choice, title, sub) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.choice = choice;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);

		this.#titleNode = new WorldNode();
		this.#titleNode.setPivot(Pivot.middleCenter);
		this.#titleNode.setAnchor(Pivot.middleCenter);
		this.#titleText = this.#titleNode.addComponent(Text);
		this.#titleText.setText(title);
		this.#titleText.setFontSize(48);
		this.#titleText.setTextAlign("center");
		this.#titleText.setTextBaseline("middle");
		this.addChild(this.#titleNode);

		this.#subNode = new WorldNode();
		this.#subNode.setPivot(Pivot.middleCenter);
		this.#subNode.setAnchor(Pivot.middleCenter);
		this.#subText = this.#subNode.addComponent(Text);
		this.#subText.setText(sub);
		this.#subText.setFontSize(28);
		this.#subText.setTextAlign("center");
		this.#subText.setTextBaseline("middle");
		this.addChild(this.#subNode);

		this.refreshAppearance();
	}

	//==============================================================================
	// refreshAppearance.
	//==============================================================================
	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
		this.#titleText.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		this.#subText.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
	}

	//==============================================================================
	// updateLayout.
	//==============================================================================
	updateLayout() {
		const size = this.getContentSize();
		this.#titleNode.setLocalPosition(Vector2.create(size.x * 0.5, size.y * 0.4));
		this.#subNode.setLocalPosition(Vector2.create(size.x * 0.5, size.y * 0.7));
	}

	//==============================================================================
	// touchRelease.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onBet(this.choice);
	}
}


//==============================================================================
// 주사위 베팅 파트.
//==============================================================================
export class DiceBetPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #diceTextNode;
	/** @private @type { Text } */ #diceText;
	/** @private @type { WorldNode } */ #resultTextNode;
	/** @private @type { Text } */ #resultText;
	/** @private @type { WorldNode } */ #betNode;
	/** @private @type { BetButton[] } */ #betButtons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #chips;
	/** @private @type { number } */ #rolls;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.#betButtons = [];
		this.#chips = STARTING_CHIPS;
		this.#rolls = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.diceBet; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "주사위 베팅"; }
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

		this.#diceTextNode = this.makeText(200);
		this.addChild(this.#diceTextNode);
		this.#diceText = this.#diceTextNode.getComponent(Text);
		markUseSystemFont(this.#diceText);

		this.#resultTextNode = this.makeText(48);
		this.addChild(this.#resultTextNode);
		this.#resultText = this.#resultTextNode.getComponent(Text);

		this.#betNode = new WorldNode();
		this.#betNode.setPivot(Pivot.topLeft);
		this.#betNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#betNode);
		this.#betButtons.push(new BetButton(this, "under", "6 이하", "x2"));
		this.#betButtons.push(new BetButton(this, "seven", "정확히 7", "x4"));
		this.#betButtons.push(new BetButton(this, "over", "8 이상", "x2"));
		for (const b of this.#betButtons) this.#betNode.addChild(b);

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
		if (this.#diceText) {
			this.#diceText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resultText) {
			this.#resultText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resetButtonPaint) {
			this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		}
		if (this.#resetButtonText) {
			this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}		for (const b of this.#betButtons) b.refreshAppearance();
	}

	//==============================================================================
	// resetGame.
	//==============================================================================
	resetGame() {
		this.#chips = STARTING_CHIPS;
		this.#rolls = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.#diceText.setText("⚀ ⚀");
		this.#resultText.setText(`${BET_AMOUNT} 칩 베팅`);
		this.refreshInfo();
	}

	//==============================================================================
	// refreshInfo.
	//==============================================================================
	refreshInfo() {
		this.#infoText.setText(`칩: ${this.#chips}    라운드 ${this.#rolls}/${TOTAL_ROLLS}`);
	}

	//==============================================================================
	// onBet.
	//==============================================================================
	/**
	 * @param { * } choice
	 */
	onBet(choice) {
		if (this.#isGameOver) {
			return;
		}
		if (this.#chips < BET_AMOUNT) {
			return;
		}		this.#chips -= BET_AMOUNT;
		const d1 = System.Math.floor(System.Math.random() * 6) + 1;
		const d2 = System.Math.floor(System.Math.random() * 6) + 1;
		const sum = d1 + d2;
		this.#diceText.setText(`${DICE_FACES[d1 - 1]} ${DICE_FACES[d2 - 1]}`);

		const theme = getCurrentGameTheme();
		let win = false;
		let payout = 0;
		if (choice === "under" && sum <= 6) { win = true; payout = BET_AMOUNT * 2; }
		else if (choice === "over" && sum >= 8) { win = true; payout = BET_AMOUNT * 2; }
		else if (choice === "seven" && sum === 7) { win = true; payout = BET_AMOUNT * 4; }

		if (win) {
			this.#chips += payout;
			this.#resultText.setText(`합 ${sum}  +${payout - BET_AMOUNT} 칩`);
			this.#resultText.setTextColor(Color.createFromHEX(theme.primary));
		}
		else {
			this.#resultText.setText(`합 ${sum}  -${BET_AMOUNT} 칩`);
			this.#resultText.setTextColor(Color.createFromHEX(theme.error));
		}
		this.#rolls += 1;
		this.refreshInfo();
		if (this.#rolls >= TOTAL_ROLLS || this.#chips < BET_AMOUNT) {
			this.endGame();
		}
	}

	//==============================================================================
	// layout.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 14;
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - gap * 2) / 3);
		const buttonH = 220;

		const infoH = 60;
		const diceH = 240;
		const resultH = 80;
		const resetH = 120;
		const vGap = 28;
		const totalH = infoH + vGap + diceH + vGap + resultH + vGap + buttonH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#diceTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + diceH * 0.5));
		cy += diceH + vGap;
		this.#resultTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
		cy += resultH + vGap;
		const betX = (contentSize.x - (buttonW * 3 + gap * 2)) * 0.5;
		this.#betNode.setLocalPosition(Vector2.create(betX, cy));
		this.#betNode.setContentSize(Vector2.create(buttonW * 3 + gap * 2, buttonH));
		for (let i = 0; i < this.#betButtons.length; ++i) {
			const b = this.#betButtons[i];
			b.setLocalPosition(Vector2.create(i * (buttonW + gap), 0));
			b.setContentSize(Vector2.create(buttonW, buttonH));
			b.updateLayout();
		}
		cy += buttonH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	//==============================================================================
	// endGame.
	//==============================================================================
	endGame() {
		this.#isGameOver = true;
		const profit = this.#chips - STARTING_CHIPS;
		const isWon = profit > 0;
		const app = this.getApp();
		app.showResult({
			isWon,
			title: isWon ? "수익!" : (profit === 0 ? "본전" : "손실"),
			score: System.Math.max(0, this.#chips),
			stats: [
				`최종 칩: ${this.#chips}`,
				`수익: ${profit >= 0 ? "+" : ""}${profit}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
