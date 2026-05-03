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
import { createButtonNode } from "./uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "./theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const TOTAL_HANDS = 5;
const STARTING_CHIPS = 100;
const BET_AMOUNT = 10;


//==============================================================================
// 액션 버튼.
//==============================================================================
class ActionButton extends WorldNode {
	/** @type { string } */ action;
	/** @private @type { BlackjackPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(part, action, text, color) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.action = action;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#paint.setColor(Color.createFromHEX(color));
		this.#label = this.addComponent(Label);
		this.#label.setText(text);
		this.#label.setFontSize(56);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.#label.setTextColor(Color.createFromHEX("#ffffff"));
	}

	setFontSize(size) { this.#label.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onAction(this.action);
	}
}


//==============================================================================
// 블랙잭 파트.
//==============================================================================
export class BlackjackPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #dealerLabelNode;
	/** @private @type { Label } */ #dealerLabel;
	/** @private @type { WorldNode } */ #playerLabelNode;
	/** @private @type { Label } */ #playerLabel;
	/** @private @type { WorldNode } */ #resultLabelNode;
	/** @private @type { Label } */ #resultLabel;
	/** @private @type { WorldNode } */ #actionsNode;
	/** @private @type { ActionButton[] } */ #actionButtons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number[] } */ #playerHand;
	/** @private @type { number[] } */ #dealerHand;
	/** @private @type { boolean } */ #playerStood;
	/** @private @type { number } */ #handsPlayed;
	/** @private @type { number } */ #chips;
	/** @private @type { boolean } */ #handOver;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#actionButtons = [];
		this.#playerHand = [];
		this.#dealerHand = [];
		this.#playerStood = false;
		this.#handsPlayed = 0;
		this.#chips = STARTING_CHIPS;
		this.#handOver = false;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.blackjack; }
	getNavigationTitle() { return "블랙잭"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = this.makeLabel(40);
		this.addChild(this.#infoLabelNode);
		this.#infoLabel = this.#infoLabelNode.getComponent(Label);

		this.#dealerLabelNode = this.makeLabel(56);
		this.addChild(this.#dealerLabelNode);
		this.#dealerLabel = this.#dealerLabelNode.getComponent(Label);

		this.#playerLabelNode = this.makeLabel(56);
		this.addChild(this.#playerLabelNode);
		this.#playerLabel = this.#playerLabelNode.getComponent(Label);

		this.#resultLabelNode = this.makeLabel(48);
		this.addChild(this.#resultLabelNode);
		this.#resultLabel = this.#resultLabelNode.getComponent(Label);

		this.#actionsNode = new WorldNode();
		this.#actionsNode.setPivot(Pivot.topLeft);
		this.#actionsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#actionsNode);
		this.#actionButtons.push(new ActionButton(this, "hit", "히트", "#3b82f6"));
		this.#actionButtons.push(new ActionButton(this, "stand", "스탠드", "#22c55e"));
		this.#actionButtons.push(new ActionButton(this, "next", "다음", "#a16207"));
		for (const b of this.#actionButtons) this.#actionsNode.addChild(b);

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
		if (this.#dealerLabel) this.#dealerLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#playerLabel) this.#playerLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resultLabel) this.#resultLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
	}

	resetGame() {
		this.#chips = STARTING_CHIPS;
		this.#handsPlayed = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.startNewHand();
	}

	startNewHand() {
		this.#playerHand = [this.drawCard(), this.drawCard()];
		this.#dealerHand = [this.drawCard(), this.drawCard()];
		this.#playerStood = false;
		this.#handOver = false;
		this.refreshLabels(true);
		this.refreshActions();
		// 즉시 블랙잭 체크.
		if (this.handValue(this.#playerHand) === 21) {
			this.playerStand();
		}
	}

	drawCard() {
		// 1..10 (J/Q/K=10, A=1 또는 11). 단순 스택리스 무한덱.
		const r = System.Math.floor(System.Math.random() * 13) + 1;
		return r > 10 ? 10 : r;
	}

	handValue(hand) {
		let sum = 0;
		let aces = 0;
		for (const v of hand) {
			sum += v;
			if (v === 1) aces += 1;
		}
		// A를 11로 쓸 수 있으면 그렇게.
		while (aces > 0 && sum + 10 <= 21) {
			sum += 10;
			aces -= 1;
		}
		return sum;
	}

	refreshLabels(hideDealer) {
		this.#infoLabel.setText(`칩: ${this.#chips}    핸드 ${this.#handsPlayed}/${TOTAL_HANDS}`);
		const playerVal = this.handValue(this.#playerHand);
		this.#playerLabel.setText(`나: [${this.#playerHand.join(", ")}]  =  ${playerVal}`);
		if (hideDealer && !this.#handOver) {
			this.#dealerLabel.setText(`딜러: [${this.#dealerHand[0]}, ?]`);
		}
		else {
			const dv = this.handValue(this.#dealerHand);
			this.#dealerLabel.setText(`딜러: [${this.#dealerHand.join(", ")}]  =  ${dv}`);
		}
	}

	refreshActions() {
		// 핸드 진행 중에는 hit/stand 활성, next 비활성. 핸드 종료 시 반대.
		this.#actionButtons[0].setActive(!this.#handOver);
		this.#actionButtons[1].setActive(!this.#handOver);
		this.#actionButtons[2].setActive(this.#handOver && !this.#isGameOver);
		this.layout();
	}

	onAction(action) {
		if (this.#isGameOver) return;
		if (action === "hit" && !this.#handOver) {
			this.#playerHand.push(this.drawCard());
			this.refreshLabels(true);
			if (this.handValue(this.#playerHand) > 21) {
				this.endHand("버스트! 패배", -BET_AMOUNT);
			}
		}
		else if (action === "stand" && !this.#handOver) {
			this.playerStand();
		}
		else if (action === "next" && this.#handOver) {
			if (this.#handsPlayed >= TOTAL_HANDS) {
				this.endGame();
			}
			else {
				this.startNewHand();
			}
		}
	}

	playerStand() {
		this.#playerStood = true;
		// 딜러 17 이상까지 히트.
		while (this.handValue(this.#dealerHand) < 17) {
			this.#dealerHand.push(this.drawCard());
		}
		const pv = this.handValue(this.#playerHand);
		const dv = this.handValue(this.#dealerHand);
		let msg, delta;
		if (dv > 21 || pv > dv) { msg = "승리!"; delta = BET_AMOUNT; }
		else if (pv === dv) { msg = "푸시 (무승부)"; delta = 0; }
		else { msg = "패배"; delta = -BET_AMOUNT; }
		this.endHand(msg, delta);
	}

	endHand(message, delta) {
		this.#handOver = true;
		this.#chips += delta;
		this.#handsPlayed += 1;
		const theme = getCurrentGameTheme();
		const sign = delta > 0 ? "+" : (delta < 0 ? "" : "±");
		this.#resultLabel.setText(`${message}  (${sign}${delta} 칩)`);
		this.#resultLabel.setTextColor(Color.createFromHEX(delta > 0 ? theme.primary : (delta < 0 ? theme.error : theme.onBackground)));
		this.refreshLabels(false);
		this.refreshActions();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 14;
		const visibleActions = this.#actionButtons.filter(b => b.isActive());
		const buttonCount = System.Math.max(visibleActions.length, 1);
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - gap * (buttonCount - 1)) / buttonCount);
		const buttonH = 180;

		const infoH = 60;
		const dealerH = 70;
		const playerH = 70;
		const resultH = 80;
		const resetH = 120;
		const vGap = 32;
		const totalH = infoH + vGap + dealerH + vGap + playerH + vGap + resultH + vGap + buttonH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#dealerLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + dealerH * 0.5));
		cy += dealerH + vGap;
		this.#playerLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + playerH * 0.5));
		cy += playerH + vGap;
		this.#resultLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
		cy += resultH + vGap;
		const totalActW = buttonW * buttonCount + gap * (buttonCount - 1);
		const actX = (contentSize.x - totalActW) * 0.5;
		this.#actionsNode.setLocalPosition(Vector2.create(actX, cy));
		this.#actionsNode.setContentSize(Vector2.create(totalActW, buttonH));
		let i = 0;
		for (const b of this.#actionButtons) {
			if (!b.isActive()) continue;
			b.setLocalPosition(Vector2.create(i * (buttonW + gap), 0));
			b.setContentSize(Vector2.create(buttonW, buttonH));
			b.setFontSize(56);
			i += 1;
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
