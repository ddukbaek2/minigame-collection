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
const COLS = 4;
const ROWS = 4;
const TILE_GAP = 8;
const FLIP_BACK_DELAY = 0.8;
const SYMBOLS = ["🍎", "🍌", "🍇", "🍒", "🍓", "🍉", "🍑", "🥝"];


//==============================================================================
// 카드 노드.
//==============================================================================
class MemoryCard extends WorldNode {
	/** @type { number } */ index;
	/** @type { string } */ symbol;
	/** @type { boolean } */ isRevealed;
	/** @type { boolean } */ isMatched;
	/** @private @type { MemoryMatchPart } */ #board;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(board, index) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.index = index;
		this.symbol = "";
		this.isRevealed = false;
		this.isMatched = false;
		this.#board = board;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(12);
		this.#label = this.addComponent(Label);
		this.#label.setText("");
		this.#label.setFontSize(80);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		markUseSystemFont(this.#label);
		this.refreshAppearance();
	}

	reset(symbol) {
		this.symbol = symbol;
		this.isRevealed = false;
		this.isMatched = false;
		this.refreshAppearance();
	}

	flipUp() {
		this.isRevealed = true;
		this.refreshAppearance();
	}

	flipDown() {
		this.isRevealed = false;
		this.refreshAppearance();
	}

	setMatched() {
		this.isMatched = true;
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		if (this.isMatched) {
			this.#paint.setColor(Color.createFromHEX(theme.surface));
			this.#label.setText(this.symbol);
			this.#label.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
		else if (this.isRevealed) {
			this.#paint.setColor(Color.createFromHEX(theme.surface));
			this.#label.setText(this.symbol);
			this.#label.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		else {
			this.#paint.setColor(Color.createFromHEX(theme.primary));
			this.#label.setText("");
		}
	}

	setFontSize(size) {
		this.#label.setFontSize(size);
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#board.onCardTapped(this);
	}
}


//==============================================================================
// 메모리 매치 파트.
//==============================================================================
export class MemoryMatchPart extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { MemoryCard[] } */ #cards;
	/** @private @type { WorldNode } */ #statusLabelNode;
	/** @private @type { Label } */ #statusLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { MemoryCard | null } */ #firstPick;
	/** @private @type { MemoryCard | null } */ #secondPick;
	/** @private @type { number } */ #flipBackTimer;
	/** @private @type { number } */ #moveCount;
	/** @private @type { number } */ #matchedPairs;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#cards = [];
		this.#firstPick = null;
		this.#secondPick = null;
		this.#flipBackTimer = 0;
		this.#moveCount = 0;
		this.#matchedPairs = 0;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.memoryMatch; }
	getNavigationTitle() { return "메모리 매치"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() {
		return this.#moveCount > 0 && !this.#isGameOver;
	}
	getExitConfirmMessage() {
		return "현재 게임을 그만두시겠습니까?";
	}

	onBuild() {
		this.setupBackground();

		this.#statusLabelNode = new WorldNode();
		this.#statusLabelNode.setPivot(Pivot.middleCenter);
		this.#statusLabelNode.setAnchor(Pivot.topLeft);
		this.#statusLabel = this.#statusLabelNode.addComponent(Label);
		this.#statusLabel.setFontSize(44);
		this.#statusLabel.setTextAlign("center");
		this.#statusLabel.setTextBaseline("middle");
		this.#statusLabel.setText("");
		this.addChild(this.#statusLabelNode);

		this.#boardNode = new WorldNode();
		this.#boardNode.setPivot(Pivot.topLeft);
		this.#boardNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#boardNode);

		for (let i = 0; i < ROWS * COLS; ++i) {
			const card = new MemoryCard(this, i);
			this.#boardNode.addChild(card);
			this.#cards.push(card);
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
		if (this.#statusLabel) {
			this.#statusLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resetButtonPaint) {
			this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		}
		if (this.#resetButtonLabel) {
			this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		for (const card of this.#cards) {
			card.refreshAppearance();
		}
	}

	resetGame() {
		this.#firstPick = null;
		this.#secondPick = null;
		this.#flipBackTimer = 0;
		this.#moveCount = 0;
		this.#matchedPairs = 0;
		this.#isGameOver = false;

		const total = ROWS * COLS;
		const pairCount = total / 2;
		const pool = [];
		for (let i = 0; i < pairCount; ++i) {
			const sym = SYMBOLS[i % SYMBOLS.length];
			pool.push(sym, sym);
		}
		for (let i = pool.length - 1; i > 0; --i) {
			const j = System.Math.floor(System.Math.random() * (i + 1));
			const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
		}
		for (let i = 0; i < this.#cards.length; ++i) {
			this.#cards[i].reset(pool[i]);
		}
		this.refreshStatusLabel();
	}

	refreshStatusLabel() {
		this.#statusLabel.setText(`이동: ${this.#moveCount}    매치: ${this.#matchedPairs}/${(ROWS * COLS) / 2}`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#flipBackTimer > 0) {
			this.#flipBackTimer -= timeDelta;
			if (this.#flipBackTimer <= 0) {
				this.#flipBackTimer = 0;
				this.processPair();
			}
		}
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const availableWidth = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availableWidth - TILE_GAP * (COLS - 1)) / COLS);
		const boardWidth = tileSize * COLS + TILE_GAP * (COLS - 1);
		const boardHeight = tileSize * ROWS + TILE_GAP * (ROWS - 1);

		const headerHeight = 80;
		const buttonHeight = 120;
		const verticalGap = 32;
		const totalHeight = headerHeight + verticalGap + boardHeight + verticalGap + buttonHeight;
		const top = System.Math.max((contentSize.y - totalHeight) * 0.5, 0);

		this.#statusLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerHeight * 0.5));

		const boardX = (contentSize.x - boardWidth) * 0.5;
		const boardY = top + headerHeight + verticalGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardWidth, boardHeight));

		const fontSize = System.Math.floor(tileSize * 0.6);
		for (let i = 0; i < this.#cards.length; ++i) {
			const card = this.#cards[i];
			const row = System.Math.floor(i / COLS);
			const col = i % COLS;
			card.setLocalPosition(Vector2.create(col * (tileSize + TILE_GAP), row * (tileSize + TILE_GAP)));
			card.setContentSize(Vector2.create(tileSize, tileSize));
			card.setFontSize(fontSize);
		}

		const buttonY = boardY + boardHeight + verticalGap + buttonHeight * 0.5;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, buttonY));
	}

	onCardTapped(card) {
		if (this.#isGameOver) return;
		if (this.#flipBackTimer > 0) return;
		if (card.isRevealed || card.isMatched) return;

		card.flipUp();
		if (this.#firstPick == null) {
			this.#firstPick = card;
			return;
		}
		this.#secondPick = card;
		this.#moveCount += 1;
		this.refreshStatusLabel();
		if (this.#firstPick.symbol === this.#secondPick.symbol) {
			this.processPair();
		}
		else {
			this.#flipBackTimer = FLIP_BACK_DELAY;
		}
	}

	processPair() {
		if (!this.#firstPick || !this.#secondPick) {
			this.#firstPick = null;
			this.#secondPick = null;
			return;
		}
		if (this.#firstPick.symbol === this.#secondPick.symbol) {
			this.#firstPick.setMatched();
			this.#secondPick.setMatched();
			this.#matchedPairs += 1;
			this.refreshStatusLabel();
		}
		else {
			this.#firstPick.flipDown();
			this.#secondPick.flipDown();
		}
		this.#firstPick = null;
		this.#secondPick = null;

		if (this.#matchedPairs >= (ROWS * COLS) / 2) {
			this.endGame();
		}
	}

	endGame() {
		this.#isGameOver = true;
		const totalPairs = (ROWS * COLS) / 2;
		// 점수: 적은 수로 끝낼수록 높음. 최대 1000.
		const minMoves = totalPairs;
		const score = System.Math.max(0, System.Math.floor(1000 - (this.#moveCount - minMoves) * 40));
		const app = this.getApp();
		app.showResult({
			isWon: true,
			title: "클리어!",
			score,
			stats: [
				`이동: ${this.#moveCount}`,
				`최소 이동: ${minMoves}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
