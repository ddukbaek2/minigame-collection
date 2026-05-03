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
	/** @private @type { Label } */ #titleLabel;
	/** @private @type { WorldNode } */ #subNode;
	/** @private @type { Label } */ #subLabel;

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
		this.#titleLabel = this.#titleNode.addComponent(Label);
		this.#titleLabel.setText(title);
		this.#titleLabel.setFontSize(48);
		this.#titleLabel.setTextAlign("center");
		this.#titleLabel.setTextBaseline("middle");
		this.addChild(this.#titleNode);

		this.#subNode = new WorldNode();
		this.#subNode.setPivot(Pivot.middleCenter);
		this.#subNode.setAnchor(Pivot.middleCenter);
		this.#subLabel = this.#subNode.addComponent(Label);
		this.#subLabel.setText(sub);
		this.#subLabel.setFontSize(28);
		this.#subLabel.setTextAlign("center");
		this.#subLabel.setTextBaseline("middle");
		this.addChild(this.#subNode);

		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
		this.#titleLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		this.#subLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
	}

	updateLayout() {
		const size = this.getContentSize();
		this.#titleNode.setLocalPosition(Vector2.create(size.x * 0.5, size.y * 0.4));
		this.#subNode.setLocalPosition(Vector2.create(size.x * 0.5, size.y * 0.7));
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onBet(this.choice);
	}
}


//==============================================================================
// 주사위 베팅 파트.
//==============================================================================
export class DiceBetPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #diceLabelNode;
	/** @private @type { Label } */ #diceLabel;
	/** @private @type { WorldNode } */ #resultLabelNode;
	/** @private @type { Label } */ #resultLabel;
	/** @private @type { WorldNode } */ #betNode;
	/** @private @type { BetButton[] } */ #betButtons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #chips;
	/** @private @type { number } */ #rolls;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#betButtons = [];
		this.#chips = STARTING_CHIPS;
		this.#rolls = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.diceBet; }
	getNavigationTitle() { return "주사위 베팅"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = this.makeLabel(40);
		this.addChild(this.#infoLabelNode);
		this.#infoLabel = this.#infoLabelNode.getComponent(Label);

		this.#diceLabelNode = this.makeLabel(200);
		this.addChild(this.#diceLabelNode);
		this.#diceLabel = this.#diceLabelNode.getComponent(Label);
		markUseSystemFont(this.#diceLabel);

		this.#resultLabelNode = this.makeLabel(48);
		this.addChild(this.#resultLabelNode);
		this.#resultLabel = this.#resultLabelNode.getComponent(Label);

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
		this.#resetButtonLabel = this.#resetButtonNode.getComponent(Label);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	makeLabel(size) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const label = node.addComponent(Label);
		label.setFontSize(size);
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
		if (this.#diceLabel) this.#diceLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resultLabel) this.#resultLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#betButtons) b.refreshAppearance();
	}

	resetGame() {
		this.#chips = STARTING_CHIPS;
		this.#rolls = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.#diceLabel.setText("⚀ ⚀");
		this.#resultLabel.setText(`${BET_AMOUNT} 칩 베팅`);
		this.refreshInfo();
	}

	refreshInfo() {
		this.#infoLabel.setText(`칩: ${this.#chips}    라운드 ${this.#rolls}/${TOTAL_ROLLS}`);
	}

	onBet(choice) {
		if (this.#isGameOver) return;
		if (this.#chips < BET_AMOUNT) return;
		this.#chips -= BET_AMOUNT;
		const d1 = System.Math.floor(System.Math.random() * 6) + 1;
		const d2 = System.Math.floor(System.Math.random() * 6) + 1;
		const sum = d1 + d2;
		this.#diceLabel.setText(`${DICE_FACES[d1 - 1]} ${DICE_FACES[d2 - 1]}`);

		const theme = getCurrentGameTheme();
		let win = false;
		let payout = 0;
		if (choice === "under" && sum <= 6) { win = true; payout = BET_AMOUNT * 2; }
		else if (choice === "over" && sum >= 8) { win = true; payout = BET_AMOUNT * 2; }
		else if (choice === "seven" && sum === 7) { win = true; payout = BET_AMOUNT * 4; }

		if (win) {
			this.#chips += payout;
			this.#resultLabel.setText(`합 ${sum}  +${payout - BET_AMOUNT} 칩`);
			this.#resultLabel.setTextColor(Color.createFromHEX(theme.primary));
		}
		else {
			this.#resultLabel.setText(`합 ${sum}  -${BET_AMOUNT} 칩`);
			this.#resultLabel.setTextColor(Color.createFromHEX(theme.error));
		}
		this.#rolls += 1;
		this.refreshInfo();
		if (this.#rolls >= TOTAL_ROLLS || this.#chips < BET_AMOUNT) {
			this.endGame();
		}
	}

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
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#diceLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + diceH * 0.5));
		cy += diceH + vGap;
		this.#resultLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
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
