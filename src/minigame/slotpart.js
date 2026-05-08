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
const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎"];
const PAYOUTS = { "🍒": 5, "🍋": 8, "🔔": 12, "⭐": 25, "💎": 50 };
const STARTING_CHIPS = 100;
const BET_AMOUNT = 5;
const TOTAL_SPINS = 15;
const SPIN_DURATION = 0.8;


//==============================================================================
// 릴 노드.
//==============================================================================
class SlotReel extends WorldNode {
	/** @type { string } */ symbol;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.symbol = SYMBOLS[0];
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#text = this.addComponent(Text);
		this.#text.setText(this.symbol);
		this.#text.setFontSize(160);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		markUseSystemFont(this.#text);
		this.refreshAppearance();
	}

	//==============================================================================
	// setSymbol.
	//==============================================================================
	/**
	 * @param { * } s
	 */
	setSymbol(s) {
		this.symbol = s;
		this.#text.setText(s);
	}

	//==============================================================================
	// refreshAppearance.
	//==============================================================================
	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surface));
	}

	//==============================================================================
	// setFontSize.
	//==============================================================================
	/**
	 * @param { * } size
	 */
	setFontSize(size) { this.#text.setFontSize(size); }
}


//==============================================================================
// 슬롯머신 파트.
//==============================================================================
export class SlotPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #reelsNode;
	/** @private @type { SlotReel[] } */ #reels;
	/** @private @type { WorldNode } */ #resultTextNode;
	/** @private @type { Text } */ #resultText;
	/** @private @type { WorldNode } */ #spinButtonNode;
	/** @private @type { Paint } */ #spinButtonPaint;
	/** @private @type { Text } */ #spinButtonText;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #chips;
	/** @private @type { number } */ #spinsDone;
	/** @private @type { number } */ #spinTimer;
	/** @private @type { boolean } */ #isSpinning;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { string[] } */ #targetSymbols;

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.#reels = [];
		this.#chips = STARTING_CHIPS;
		this.#spinsDone = 0;
		this.#spinTimer = 0;
		this.#isSpinning = false;
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#targetSymbols = [];
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.slot; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "슬롯머신"; }
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

		this.#reelsNode = new WorldNode();
		this.#reelsNode.setPivot(Pivot.topLeft);
		this.#reelsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#reelsNode);
		for (let i = 0; i < 3; ++i) {
			const r = new SlotReel();
			this.#reelsNode.addChild(r);
			this.#reels.push(r);
		}

		this.#resultTextNode = this.makeText(48);
		this.addChild(this.#resultTextNode);
		this.#resultText = this.#resultTextNode.getComponent(Text);

		this.#spinButtonNode = createButtonNode(
			"스핀",
			Vector2.create(480, 160),
			Color.createFromHEX(getCurrentGameTheme().primary),
			Color.createFromHEX(getCurrentGameTheme().onPrimary),
			64,
			() => { this.spin(); },
		);
		this.#spinButtonPaint = this.#spinButtonNode.getComponent(Paint);
		this.#spinButtonText = this.#spinButtonNode.getComponent(Text);
		this.addChild(this.#spinButtonNode);

		this.#resetButtonNode = createButtonNode(
			"다시하기",
			Vector2.create(360, 120),
			Color.createFromHEX(getCurrentGameTheme().secondary),
			Color.createFromHEX(getCurrentGameTheme().onSecondary),
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
		if (this.#resultText) {
			this.#resultText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#spinButtonPaint) {
			this.#spinButtonPaint.setColor(Color.createFromHEX(theme.primary));
		}
		if (this.#spinButtonText) {
			this.#spinButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		if (this.#resetButtonPaint) {
			this.#resetButtonPaint.setColor(Color.createFromHEX(theme.secondary));
		}
		if (this.#resetButtonText) {
			this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onSecondary));
		}		for (const r of this.#reels) r.refreshAppearance();
	}

	//==============================================================================
	// resetGame.
	//==============================================================================
	resetGame() {
		this.#chips = STARTING_CHIPS;
		this.#spinsDone = 0;
		this.#isSpinning = false;
		this.#isStarted = true;
		this.#isGameOver = false;
		for (const r of this.#reels) r.setSymbol(SYMBOLS[0]);
		this.#resultText.setText("스핀 버튼을 누르세요");
		this.refreshInfo();
	}

	//==============================================================================
	// refreshInfo.
	//==============================================================================
	refreshInfo() {
		this.#infoText.setText(`칩: ${this.#chips}    스핀 ${this.#spinsDone}/${TOTAL_SPINS}`);
	}

	//==============================================================================
	// spin.
	//==============================================================================
	spin() {
		if (this.#isGameOver || this.#isSpinning) {
			return;
		}
		if (this.#chips < BET_AMOUNT) {
			return;
		}		this.#chips -= BET_AMOUNT;
		this.#isSpinning = true;
		this.#spinTimer = SPIN_DURATION;
		this.#targetSymbols = [
			SYMBOLS[System.Math.floor(System.Math.random() * SYMBOLS.length)],
			SYMBOLS[System.Math.floor(System.Math.random() * SYMBOLS.length)],
			SYMBOLS[System.Math.floor(System.Math.random() * SYMBOLS.length)],
		];
		this.#resultText.setText("스핀 중...");
		this.refreshInfo();
	}

	//==============================================================================
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isSpinning) {
			return;
		}		this.#spinTimer -= timeDelta;
		// 빙글빙글: 매 프레임마다 무작위 심볼.
		if (this.#spinTimer > 0) {
			for (const r of this.#reels) {
				r.setSymbol(SYMBOLS[System.Math.floor(System.Math.random() * SYMBOLS.length)]);
			}
		}
		else {
			// 스핀 종료.
			for (let i = 0; i < this.#reels.length; ++i) {
				this.#reels[i].setSymbol(this.#targetSymbols[i]);
			}
			this.#isSpinning = false;
			this.#spinsDone += 1;
			this.evaluateSpin();
		}
	}

	//==============================================================================
	// evaluateSpin.
	//==============================================================================
	evaluateSpin() {
		const [a, b, c] = this.#targetSymbols;
		const theme = getCurrentGameTheme();
		let payout = 0;
		let msg = "꽝";
		if (a === b && b === c) {
			payout = PAYOUTS[a] * BET_AMOUNT;
			msg = `잭팟! ${a}${a}${a}  +${payout}`;
		}
		else if (a === b || b === c || a === c) {
			payout = System.Math.floor(BET_AMOUNT * 1.5);
			msg = `2개 매치  +${payout - BET_AMOUNT}`;
		}
		this.#chips += payout;
		this.#resultText.setText(msg);
		this.#resultText.setTextColor(Color.createFromHEX(payout > 0 ? theme.primary : theme.error));
		this.refreshInfo();
		if (this.#spinsDone >= TOTAL_SPINS || this.#chips < BET_AMOUNT) {
			this.endGame();
		}
	}

	//==============================================================================
	// layout.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const reelGap = 16;
		const reelSize = System.Math.floor((contentSize.x - margin * 2 - reelGap * 2) / 3);

		const infoH = 60;
		const reelsH = reelSize;
		const resultH = 80;
		const spinH = 160;
		const resetH = 120;
		const vGap = 32;
		const totalH = infoH + vGap + reelsH + vGap + resultH + vGap + spinH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		const reelsX = (contentSize.x - (reelSize * 3 + reelGap * 2)) * 0.5;
		this.#reelsNode.setLocalPosition(Vector2.create(reelsX, cy));
		this.#reelsNode.setContentSize(Vector2.create(reelSize * 3 + reelGap * 2, reelSize));
		const fontSize = System.Math.floor(reelSize * 0.65);
		for (let i = 0; i < this.#reels.length; ++i) {
			this.#reels[i].setLocalPosition(Vector2.create(i * (reelSize + reelGap), 0));
			this.#reels[i].setContentSize(Vector2.create(reelSize, reelSize));
			this.#reels[i].setFontSize(fontSize);
		}
		cy += reelsH + vGap;
		this.#resultTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
		cy += resultH + vGap;
		this.#spinButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + spinH * 0.5));
		cy += spinH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	//==============================================================================
	// endGame.
	//==============================================================================
	endGame() {
		this.#isGameOver = true;
		const profit = this.#chips - STARTING_CHIPS;
		const app = this.getApp();
		app.showResult({
			isWon: profit > 0,
			title: profit > 0 ? "수익!" : (profit === 0 ? "본전" : "손실"),
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
