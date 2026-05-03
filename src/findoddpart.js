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
const GAME_DURATION = 30;
const MAX_LEVEL = 8;            // 그리드 N x N 의 N 최대치 (4..8)
const MIN_LEVEL = 3;


//==============================================================================
// 셀 노드.
//==============================================================================
class FindOddCell extends WorldNode {
	/** @type { boolean } */ isOdd;
	/** @private @type { FindOddPart } */ #part;
	/** @private @type { Paint } */ #paint;

	constructor(part) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.isOdd = false;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(8);
	}

	setColor(color) {
		this.#paint.setColor(color);
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onCellTapped(this);
	}
}


//==============================================================================
// 다른색 찾기 파트.
//==============================================================================
export class FindOddPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { FindOddCell[] } */ #cells;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #score;
	/** @private @type { number } */ #level;
	/** @private @type { number } */ #boardSize;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#cells = [];
		this.#remainingTime = GAME_DURATION;
		this.#score = 0;
		this.#level = MIN_LEVEL;
		this.#boardSize = 600;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.findOdd; }
	getNavigationTitle() { return "다른색 찾기"; }
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

		this.#boardNode = new WorldNode();
		this.#boardNode.setPivot(Pivot.topLeft);
		this.#boardNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#boardNode);
		// MAX_LEVEL^2 까지의 셀을 미리 풀로 생성하고, 레벨에 따라 활성/비활성.
		for (let i = 0; i < MAX_LEVEL * MAX_LEVEL; ++i) {
			const cell = new FindOddCell(this);
			this.#boardNode.addChild(cell);
			this.#cells.push(cell);
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

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoLabel) this.#infoLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		this.applyRound();
	}

	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#score = 0;
		this.#level = MIN_LEVEL;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.applyRound();
		this.refreshInfo();
	}

	refreshInfo() {
		const t = System.Math.ceil(this.#remainingTime);
		this.#infoLabel.setText(`시간: ${t}초    점수: ${this.#score}    레벨: ${this.#level}`);
	}

	//==============================================================================
	// 현재 레벨에 맞춰 셀 활성화 + 색 부여.
	//==============================================================================
	applyRound() {
		const n = this.#level;
		const total = n * n;
		// 베이스 색은 무작위. odd 색은 베이스 색에서 명도 조금 다르게.
		const r = System.Math.floor(System.Math.random() * 200) + 30;
		const g = System.Math.floor(System.Math.random() * 200) + 30;
		const b = System.Math.floor(System.Math.random() * 200) + 30;
		// 차이값은 레벨이 높아질수록 작아짐 (어려워짐).
		const diff = System.Math.max(12, 80 - this.#level * 8);
		// 한 색 채널에서 +diff (또는 -diff) 줌.
		const sign = System.Math.random() < 0.5 ? 1 : -1;
		const channel = System.Math.floor(System.Math.random() * 3);
		const baseHex = `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`;
		const oddR = channel === 0 ? this.clamp(r + sign * diff) : r;
		const oddG = channel === 1 ? this.clamp(g + sign * diff) : g;
		const oddB = channel === 2 ? this.clamp(b + sign * diff) : b;
		const oddHex = `#${this.toHex(oddR)}${this.toHex(oddG)}${this.toHex(oddB)}`;

		const oddIndex = System.Math.floor(System.Math.random() * total);
		const baseColor = Color.createFromHEX(baseHex);
		const oddColor = Color.createFromHEX(oddHex);
		for (let i = 0; i < this.#cells.length; ++i) {
			const cell = this.#cells[i];
			if (i >= total) {
				cell.setActive(false);
				cell.isOdd = false;
				continue;
			}
			cell.setActive(true);
			cell.isOdd = (i === oddIndex);
			cell.setColor(cell.isOdd ? oddColor : baseColor);
		}
		this.layout();
	}

	clamp(v) { return System.Math.max(0, System.Math.min(255, v)); }
	toHex(v) {
		const s = v.toString(16);
		return s.length === 1 ? "0" + s : s;
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

	onCellTapped(cell) {
		if (this.#isGameOver) return;
		if (cell.isOdd) {
			this.#score += this.#level * 10;
			if (this.#level < MAX_LEVEL) this.#level += 1;
			this.applyRound();
		}
		else {
			this.#score = System.Math.max(0, this.#score - 20);
			this.#remainingTime = System.Math.max(0, this.#remainingTime - 2);
		}
		this.refreshInfo();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const availW = contentSize.x - margin * 2;
		// 보드 크기는 항상 availW 정사각.
		const boardSize = availW;
		this.#boardSize = boardSize;

		const headerH = 80;
		const buttonH = 120;
		const vGap = 32;
		const totalH = headerH + vGap + boardSize + vGap + buttonH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerH * 0.5));

		const boardX = (contentSize.x - boardSize) * 0.5;
		const boardY = top + headerH + vGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardSize, boardSize));

		const n = this.#level;
		const gap = System.Math.max(2, 10 - n);
		const tileSize = System.Math.floor((boardSize - gap * (n - 1)) / n);
		for (let i = 0; i < this.#cells.length; ++i) {
			const cell = this.#cells[i];
			if (!cell.isActive()) continue;
			const r = System.Math.floor(i / n);
			const c = i % n;
			cell.setLocalPosition(Vector2.create(c * (tileSize + gap), r * (tileSize + gap)));
			cell.setContentSize(Vector2.create(tileSize, tileSize));
		}

		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, boardY + boardSize + vGap + buttonH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const app = this.getApp();
		app.showResult({
			isWon: this.#score >= 100,
			title: "타임 오버!",
			score: this.#score,
			stats: [
				`최종 레벨: ${this.#level}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
