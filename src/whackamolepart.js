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
const SIZE = 3;
const TILE_GAP = 12;
const GAME_DURATION = 30;          // 30초
const MOLE_MIN_LIFETIME = 0.6;
const MOLE_MAX_LIFETIME = 1.4;
const MOLE_SPAWN_INTERVAL_MIN = 0.4;
const MOLE_SPAWN_INTERVAL_MAX = 1.0;
const MAX_ACTIVE_MOLES = 3;
const MOLE_EMOJI = "🦔";
const HIT_EMOJI = "💥";


//==============================================================================
// 셀 노드.
//==============================================================================
class WhackCell extends WorldNode {
	/** @type { number } */ index;
	/** @type { boolean } */ hasMole;
	/** @type { boolean } */ wasHit;
	/** @type { number } */ lifetime;
	/** @private @type { WhackAMolePart } */ #board;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(board, index) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.index = index;
		this.hasMole = false;
		this.wasHit = false;
		this.lifetime = 0;
		this.#board = board;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#label = this.addComponent(Label);
		this.#label.setText("");
		this.#label.setFontSize(120);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		markUseSystemFont(this.#label);
		this.refreshAppearance();
	}

	reset() {
		this.hasMole = false;
		this.wasHit = false;
		this.lifetime = 0;
		this.refreshAppearance();
	}

	spawnMole(lifetime) {
		this.hasMole = true;
		this.wasHit = false;
		this.lifetime = lifetime;
		this.refreshAppearance();
	}

	despawnMole() {
		this.hasMole = false;
		this.wasHit = false;
		this.lifetime = 0;
		this.refreshAppearance();
	}

	hit() {
		this.wasHit = true;
		this.lifetime = 0.3;
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		if (this.wasHit) {
			this.#paint.setColor(Color.createFromHEX(theme.error));
			this.#label.setText(HIT_EMOJI);
		}
		else if (this.hasMole) {
			this.#paint.setColor(Color.createFromHEX(theme.secondary));
			this.#label.setText(MOLE_EMOJI);
		}
		else {
			this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
			this.#label.setText("");
		}
	}

	setFontSize(size) {
		this.#label.setFontSize(size);
	}

	tickCell(timeDelta) {
		if (this.lifetime > 0) {
			this.lifetime -= timeDelta;
			if (this.lifetime <= 0) {
				this.lifetime = 0;
				if (this.wasHit) {
					this.despawnMole();
				}
				else if (this.hasMole) {
					// 놓침.
					this.despawnMole();
					this.#board.onMoleMissed();
				}
			}
		}
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#board.onCellTapped(this);
	}
}


//==============================================================================
// 두더지잡기 파트.
//==============================================================================
export class WhackAMolePart extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { WhackCell[] } */ #cells;
	/** @private @type { WorldNode } */ #statusLabelNode;
	/** @private @type { Label } */ #statusLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #spawnTimer;
	/** @private @type { number } */ #score;
	/** @private @type { number } */ #hits;
	/** @private @type { number } */ #misses;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#cells = [];
		this.#remainingTime = GAME_DURATION;
		this.#spawnTimer = 0;
		this.#score = 0;
		this.#hits = 0;
		this.#misses = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.whackAMole; }
	getNavigationTitle() { return "두더지잡기"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() {
		return this.#isStarted && !this.#isGameOver;
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

		for (let i = 0; i < SIZE * SIZE; ++i) {
			const cell = new WhackCell(this, i);
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
		for (const cell of this.#cells) {
			cell.refreshAppearance();
		}
	}

	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#spawnTimer = MOLE_SPAWN_INTERVAL_MIN;
		this.#score = 0;
		this.#hits = 0;
		this.#misses = 0;
		this.#isStarted = true;        // 진입 즉시 시작.
		this.#isGameOver = false;
		for (const cell of this.#cells) {
			cell.reset();
		}
		this.refreshStatusLabel();
	}

	refreshStatusLabel() {
		const seconds = System.Math.ceil(this.#remainingTime);
		this.#statusLabel.setText(`점수: ${this.#score}    시간: ${seconds}초`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isStarted || this.#isGameOver) return;

		this.#remainingTime -= timeDelta;
		if (this.#remainingTime <= 0) {
			this.#remainingTime = 0;
			this.refreshStatusLabel();
			this.endGame();
			return;
		}

		for (const cell of this.#cells) {
			cell.tickCell(timeDelta);
		}

		this.#spawnTimer -= timeDelta;
		if (this.#spawnTimer <= 0) {
			this.spawnMole();
			const range = MOLE_SPAWN_INTERVAL_MAX - MOLE_SPAWN_INTERVAL_MIN;
			this.#spawnTimer = MOLE_SPAWN_INTERVAL_MIN + System.Math.random() * range;
		}

		this.refreshStatusLabel();
	}

	spawnMole() {
		// 활성 두더지 수 제한.
		const active = this.#cells.filter(c => c.hasMole && !c.wasHit);
		if (active.length >= MAX_ACTIVE_MOLES) return;
		const empties = this.#cells.filter(c => !c.hasMole);
		if (empties.length === 0) return;
		const cell = empties[System.Math.floor(System.Math.random() * empties.length)];
		const lifetime = MOLE_MIN_LIFETIME + System.Math.random() * (MOLE_MAX_LIFETIME - MOLE_MIN_LIFETIME);
		cell.spawnMole(lifetime);
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 60;
		const availableWidth = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availableWidth - TILE_GAP * (SIZE - 1)) / SIZE);
		const boardWidth = tileSize * SIZE + TILE_GAP * (SIZE - 1);
		const boardHeight = tileSize * SIZE + TILE_GAP * (SIZE - 1);

		const headerHeight = 80;
		const buttonHeight = 120;
		const verticalGap = 40;
		const totalHeight = headerHeight + verticalGap + boardHeight + verticalGap + buttonHeight;
		const top = System.Math.max((contentSize.y - totalHeight) * 0.5, 0);

		this.#statusLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerHeight * 0.5));

		const boardX = (contentSize.x - boardWidth) * 0.5;
		const boardY = top + headerHeight + verticalGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardWidth, boardHeight));

		const fontSize = System.Math.floor(tileSize * 0.6);
		for (let i = 0; i < this.#cells.length; ++i) {
			const cell = this.#cells[i];
			const row = System.Math.floor(i / SIZE);
			const col = i % SIZE;
			cell.setLocalPosition(Vector2.create(col * (tileSize + TILE_GAP), row * (tileSize + TILE_GAP)));
			cell.setContentSize(Vector2.create(tileSize, tileSize));
			cell.setFontSize(fontSize);
		}

		const buttonY = boardY + boardHeight + verticalGap + buttonHeight * 0.5;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, buttonY));
	}

	onCellTapped(cell) {
		if (this.#isGameOver) return;
		if (cell.hasMole && !cell.wasHit) {
			cell.hit();
			this.#hits += 1;
			this.#score += 10;
			this.refreshStatusLabel();
		}
		else if (!cell.hasMole) {
			// 빈칸 때리면 -2 (최저 0).
			this.#score = System.Math.max(0, this.#score - 2);
			this.refreshStatusLabel();
		}
	}

	onMoleMissed() {
		this.#misses += 1;
	}

	endGame() {
		this.#isGameOver = true;
		const total = this.#hits + this.#misses;
		const accuracy = total > 0 ? System.Math.round((this.#hits / total) * 100) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: this.#score > 0,
			title: "타임 오버!",
			score: this.#score,
			stats: [
				`잡은 두더지: ${this.#hits}`,
				`놓친 두더지: ${this.#misses}`,
				`정확도: ${accuracy}%`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
