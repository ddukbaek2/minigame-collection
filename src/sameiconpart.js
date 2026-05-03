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
const SYMBOL_POOL = ["🍎","🍌","🍇","🍒","🍓","🍉","🍑","🥝","🍍","🥥","🥑","🍅","🥕","🌽","🍆","🥦"];
const ICONS_PER_CARD = 5;
const GAME_DURATION = 45;


//==============================================================================
// 카드 노드 (자식으로 아이콘 라벨들).
//==============================================================================
class IconNode extends WorldNode {
	/** @type { string } */ symbol;
	/** @private @type { SameIconPart } */ #part;
	/** @private @type { Label } */ #label;

	constructor(part, symbol) {
		super();
		this.setPivot(Pivot.middleCenter);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.symbol = symbol;
		this.#part = part;
		this.#label = this.addComponent(Label);
		this.#label.setText(symbol);
		this.#label.setFontSize(80);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		markUseSystemFont(this.#label);
	}

	setFontSize(s) { this.#label.setFontSize(s); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onSymbolTapped(this.symbol);
	}
}


//==============================================================================
// 공통아이콘 파트.
//==============================================================================
export class SameIconPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #cardANode;
	/** @private @type { Paint } */ #cardAPaint;
	/** @private @type { WorldNode } */ #cardBNode;
	/** @private @type { Paint } */ #cardBPaint;
	/** @private @type { IconNode[] } */ #cardAIcons;
	/** @private @type { IconNode[] } */ #cardBIcons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { string } */ #commonSymbol;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #correctCount;
	/** @private @type { number } */ #wrongCount;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#cardAIcons = [];
		this.#cardBIcons = [];
		this.#commonSymbol = "";
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.sameIcon; }
	getNavigationTitle() { return "공통아이콘"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = new WorldNode();
		this.#infoLabelNode.setPivot(Pivot.middleCenter);
		this.#infoLabelNode.setAnchor(Pivot.topLeft);
		this.#infoLabel = this.#infoLabelNode.addComponent(Label);
		this.#infoLabel.setFontSize(40);
		this.#infoLabel.setTextAlign("center");
		this.#infoLabel.setTextBaseline("middle");
		this.#infoLabel.setText("");
		this.addChild(this.#infoLabelNode);

		this.#cardANode = this.makeCard();
		this.#cardAPaint = this.#cardANode.getComponent(Paint);
		this.addChild(this.#cardANode);
		this.#cardBNode = this.makeCard();
		this.#cardBPaint = this.#cardBNode.getComponent(Paint);
		this.addChild(this.#cardBNode);

		for (let i = 0; i < ICONS_PER_CARD; ++i) {
			const a = new IconNode(this, "");
			this.#cardANode.addChild(a);
			this.#cardAIcons.push(a);
			const b = new IconNode(this, "");
			this.#cardBNode.addChild(b);
			this.#cardBIcons.push(b);
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

	makeCard() {
		const node = new WorldNode();
		node.setPivot(Pivot.topLeft);
		node.setAnchor(Pivot.topLeft);
		const paint = node.addComponent(Paint);
		paint.setRoundSize(20);
		return node;
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoLabel) this.#infoLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#cardAPaint) this.#cardAPaint.setColor(Color.createFromHEX(theme.surface));
		if (this.#cardBPaint) this.#cardBPaint.setColor(Color.createFromHEX(theme.surface));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
	}

	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.nextRound();
		this.refreshInfo();
	}

	nextRound() {
		// 카드 A 와 B 모두 ICONS_PER_CARD 개의 아이콘을 가지며, 정확히 1개가 공통.
		const pool = SYMBOL_POOL.slice();
		// shuffle.
		for (let i = pool.length - 1; i > 0; --i) {
			const j = System.Math.floor(System.Math.random() * (i + 1));
			const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
		}
		const common = pool.shift();
		const aOnly = pool.splice(0, ICONS_PER_CARD - 1);
		const bOnly = pool.splice(0, ICONS_PER_CARD - 1);
		const cardA = [common].concat(aOnly);
		const cardB = [common].concat(bOnly);
		// 각 카드 내 셔플.
		for (const arr of [cardA, cardB]) {
			for (let i = arr.length - 1; i > 0; --i) {
				const j = System.Math.floor(System.Math.random() * (i + 1));
				const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
			}
		}
		for (let i = 0; i < ICONS_PER_CARD; ++i) {
			this.#cardAIcons[i].symbol = cardA[i];
			this.#cardAIcons[i].getComponent(Label).setText(cardA[i]);
			this.#cardBIcons[i].symbol = cardB[i];
			this.#cardBIcons[i].getComponent(Label).setText(cardB[i]);
		}
		this.#commonSymbol = common;
	}

	refreshInfo() {
		const t = System.Math.ceil(this.#remainingTime);
		this.#infoLabel.setText(`시간: ${t}초    정답 ${this.#correctCount}    오답 ${this.#wrongCount}`);
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

	onSymbolTapped(symbol) {
		if (this.#isGameOver) return;
		if (symbol === this.#commonSymbol) this.#correctCount += 1;
		else { this.#wrongCount += 1; this.#remainingTime = System.Math.max(0, this.#remainingTime - 3); }
		this.nextRound();
		this.refreshInfo();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const cardW = contentSize.x - margin * 2;
		const cardH = 480;

		const infoH = 60;
		const cardGap = 24;
		const resetH = 120;
		const vGap = 24;
		const totalH = infoH + vGap + cardH + cardGap + cardH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#cardANode.setLocalPosition(Vector2.create(margin, cy));
		this.#cardANode.setContentSize(Vector2.create(cardW, cardH));
		this.layoutCardIcons(this.#cardAIcons, cardW, cardH);
		cy += cardH + cardGap;
		this.#cardBNode.setLocalPosition(Vector2.create(margin, cy));
		this.#cardBNode.setContentSize(Vector2.create(cardW, cardH));
		this.layoutCardIcons(this.#cardBIcons, cardW, cardH);
		cy += cardH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	layoutCardIcons(icons, w, h) {
		// 카드 안에 5개 아이콘을 무작위 같지만 안정된 위치에 배치.
		// 간단히 그리드: 3 위 + 2 아래 (또는 적절히).
		// 회전/크기 약간 다르게 두고 싶지만 단순화: 5개를 동일 크기로 분산.
		const slots = [
			[0.20, 0.30], [0.50, 0.25], [0.80, 0.35],
			[0.30, 0.70], [0.70, 0.75],
		];
		const iconSize = System.Math.floor(System.Math.min(w, h) * 0.3);
		for (let i = 0; i < icons.length; ++i) {
			const [fx, fy] = slots[i];
			icons[i].setLocalPosition(Vector2.create(w * fx, h * fy));
			icons[i].setContentSize(Vector2.create(iconSize, iconSize));
			icons[i].setFontSize(System.Math.floor(iconSize * 0.9));
		}
	}

	endGame() {
		this.#isGameOver = true;
		const score = System.Math.max(0, this.#correctCount * 80 - this.#wrongCount * 30);
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
