//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../../libs/vanilla.js/src/core/component/label.js";
import { Part, PartId } from "../part.js";
import { createButtonNode } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const SIZE = 4;
const TILE_GAP = 6;
const SHUFFLE_MOVES = 80;
// 슬라이드 보간 계수. 값이 클수록 빠르게 수렴 (지수 감쇠 lerp 의 시정수 ≈ 1/SLIDE_RATE 초).
const SLIDE_RATE = 18;
const SLIDE_SNAP_PIXELS = 0.5;


//==============================================================================
// 타일 노드.
// - value 는 1..15 (생성 후 불변), 빈 슬롯에는 별도 타일이 없다.
// - slotIndex 는 현재 슬롯 위치 (0..15). 보드가 갱신해주는 값.
// - currentX/Y 는 실제 그려지는 위치, targetX/Y 로 매 tick 보간돼서 부드럽게 이동.
//==============================================================================
class PuzzleTile extends WorldNode {
	/** @type { number } */ value;
	/** @type { number } */ slotIndex;
	/** @private @type { Puzzle15Part } */ #board;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;
	/** @private @type { number } */ #currentX;
	/** @private @type { number } */ #currentY;
	/** @private @type { number } */ #targetX;
	/** @private @type { number } */ #targetY;
	/** @private @type { boolean } */ #isAnimating;

	constructor(board, value) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.value = value;
		this.slotIndex = 0;
		this.#board = board;
		this.#currentX = 0;
		this.#currentY = 0;
		this.#targetX = 0;
		this.#targetY = 0;
		this.#isAnimating = false;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(10);
		this.#label = this.addComponent(Label);
		this.#label.setText(String(value));
		this.#label.setFontSize(80);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.primary));
		this.#label.setTextColor(Color.createFromHEX(theme.onPrimary));
	}

	setFontSize(size) {
		this.#label.setFontSize(size);
	}

	//==============================================================================
	// 슬롯 위치(픽셀) 갱신.
	// - instant=true: 즉시 점프. (셔플, 레이아웃 갱신 등)
	// - instant=false: target 만 바꾸고 tick 에서 부드럽게 보간.
	//==============================================================================
	setSlotPosition(slotIndex, pixelX, pixelY, instant) {
		this.slotIndex = slotIndex;
		this.#targetX = pixelX;
		this.#targetY = pixelY;
		if (instant) {
			this.#currentX = pixelX;
			this.#currentY = pixelY;
			this.#isAnimating = false;
			this.setLocalPosition(Vector2.create(pixelX, pixelY));
		}
		else {
			this.#isAnimating = true;
		}
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isAnimating) return;
		// 지수 감쇠 lerp. (frame-rate 독립적인 부드러운 수렴)
		const factor = 1 - System.Math.exp(-SLIDE_RATE * timeDelta);
		this.#currentX += (this.#targetX - this.#currentX) * factor;
		this.#currentY += (this.#targetY - this.#currentY) * factor;
		const dx = this.#targetX - this.#currentX;
		const dy = this.#targetY - this.#currentY;
		if (dx * dx + dy * dy < SLIDE_SNAP_PIXELS * SLIDE_SNAP_PIXELS) {
			this.#currentX = this.#targetX;
			this.#currentY = this.#targetY;
			this.#isAnimating = false;
		}
		this.setLocalPosition(Vector2.create(this.#currentX, this.#currentY));
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#board.onTileTapped(this);
	}
}


//==============================================================================
// 15퍼즐 파트.
//==============================================================================
export class Puzzle15Part extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { PuzzleTile[] } */ #tiles;            // value 1..15 의 영구 노드 배열.
	/** @private @type { Array<PuzzleTile|null> } */ #slotToTile; // 슬롯 인덱스 → 타일(없으면 null).
	/** @private @type { number } */ #emptyIndex;
	/** @private @type { WorldNode } */ #statusLabelNode;
	/** @private @type { Label } */ #statusLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #moveCount;
	/** @private @type { number } */ #elapsedSeconds;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { number } */ #tileSize;
	/** @private @type { number } */ #boardX;
	/** @private @type { number } */ #boardY;

	constructor() {
		super();
		this.#tiles = [];
		this.#slotToTile = new Array(SIZE * SIZE).fill(null);
		this.#emptyIndex = SIZE * SIZE - 1;
		this.#moveCount = 0;
		this.#elapsedSeconds = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#tileSize = 0;
		this.#boardX = 0;
		this.#boardY = 0;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.puzzle15; }
	getNavigationTitle() { return "15퍼즐"; }
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

		// 1..15 영구 타일 생성. 슬롯 매핑은 resetGame 에서 부여.
		for (let value = 1; value <= SIZE * SIZE - 1; ++value) {
			const tile = new PuzzleTile(this, value);
			this.#boardNode.addChild(tile);
			this.#tiles.push(tile);
		}

		this.#resetButtonNode = createButtonNode(
			"섞기",
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
		for (const tile of this.#tiles) {
			tile.refreshAppearance();
		}
	}

	resetGame() {
		this.#moveCount = 0;
		this.#elapsedSeconds = 0;
		this.#isStarted = false;
		this.#isGameOver = false;

		// 슬롯 매핑 초기화: 타일 value=N 은 슬롯 N-1 에. 마지막 슬롯은 빈 칸.
		for (let i = 0; i < this.#slotToTile.length; ++i) this.#slotToTile[i] = null;
		for (const tile of this.#tiles) {
			const slot = tile.value - 1;
			tile.slotIndex = slot;
			this.#slotToTile[slot] = tile;
		}
		this.#emptyIndex = SIZE * SIZE - 1;

		// 픽셀 위치 즉시 적용.
		this.applyAllSlotPositions(true);

		// 빈 칸을 인접 무작위 방향으로 SHUFFLE_MOVES 번 이동시켜 풀이 가능한 상태 보장.
		let lastFrom = -1;
		for (let i = 0; i < SHUFFLE_MOVES; ++i) {
			const adjacents = this.getAdjacentIndices(this.#emptyIndex).filter(idx => idx !== lastFrom);
			const pick = adjacents[System.Math.floor(System.Math.random() * adjacents.length)];
			const movingTile = this.#slotToTile[pick];
			lastFrom = this.#emptyIndex;
			this.moveTileToEmpty(movingTile, true);
		}
		this.refreshStatusLabel();
		// 셔플 직후 풀린 상태면 한 번 더.
		if (this.isSolved()) {
			this.resetGame();
		}
	}

	refreshStatusLabel() {
		const seconds = System.Math.floor(this.#elapsedSeconds);
		this.#statusLabel.setText(`이동: ${this.#moveCount}    시간: ${seconds}초`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isStarted && !this.#isGameOver) {
			this.#elapsedSeconds += timeDelta;
			this.refreshStatusLabel();
		}
	}

	getAdjacentIndices(index) {
		const row = System.Math.floor(index / SIZE);
		const col = index % SIZE;
		const out = [];
		if (row > 0) out.push((row - 1) * SIZE + col);
		if (row < SIZE - 1) out.push((row + 1) * SIZE + col);
		if (col > 0) out.push(row * SIZE + (col - 1));
		if (col < SIZE - 1) out.push(row * SIZE + (col + 1));
		return out;
	}

	//==============================================================================
	// 슬롯 인덱스의 픽셀 좌상단 좌표.
	//==============================================================================
	slotToPixelX(slotIndex) {
		return (slotIndex % SIZE) * (this.#tileSize + TILE_GAP);
	}
	slotToPixelY(slotIndex) {
		return System.Math.floor(slotIndex / SIZE) * (this.#tileSize + TILE_GAP);
	}

	//==============================================================================
	// 모든 타일의 위치를 자기 slotIndex 의 픽셀로 동기화.
	//==============================================================================
	applyAllSlotPositions(instant) {
		for (const tile of this.#tiles) {
			const x = this.slotToPixelX(tile.slotIndex);
			const y = this.slotToPixelY(tile.slotIndex);
			tile.setSlotPosition(tile.slotIndex, x, y, instant);
		}
	}

	//==============================================================================
	// 타일 한 개를 빈 슬롯으로 이동. 슬롯 매핑/빈 슬롯 갱신 + 위치 애니메이션.
	//==============================================================================
	moveTileToEmpty(tile, instant) {
		const fromSlot = tile.slotIndex;
		const toSlot = this.#emptyIndex;
		this.#slotToTile[fromSlot] = null;
		this.#slotToTile[toSlot] = tile;
		this.#emptyIndex = fromSlot;
		const x = this.slotToPixelX(toSlot);
		const y = this.slotToPixelY(toSlot);
		tile.setSlotPosition(toSlot, x, y, instant);
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const availableWidth = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availableWidth - TILE_GAP * (SIZE - 1)) / SIZE);
		const boardWidth = tileSize * SIZE + TILE_GAP * (SIZE - 1);
		const boardHeight = tileSize * SIZE + TILE_GAP * (SIZE - 1);

		const headerHeight = 80;
		const buttonHeight = 120;
		const verticalGap = 32;
		const totalHeight = headerHeight + verticalGap + boardHeight + verticalGap + buttonHeight;
		const top = System.Math.max((contentSize.y - totalHeight) * 0.5, 0);

		this.#statusLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerHeight * 0.5));

		const boardX = (contentSize.x - boardWidth) * 0.5;
		const boardY = top + headerHeight + verticalGap;
		this.#boardX = boardX;
		this.#boardY = boardY;
		this.#tileSize = tileSize;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardWidth, boardHeight));

		const fontSize = System.Math.floor(tileSize * 0.6);
		for (const tile of this.#tiles) {
			tile.setContentSize(Vector2.create(tileSize, tileSize));
			tile.setFontSize(fontSize);
		}
		// 새 tileSize 로 픽셀 좌표 재계산해 즉시 반영. (창 크기 변화 등에서 점프 허용)
		this.applyAllSlotPositions(true);

		const buttonY = boardY + boardHeight + verticalGap + buttonHeight * 0.5;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, buttonY));
	}

	onTileTapped(tile) {
		if (this.#isGameOver) return;
		const fromSlot = tile.slotIndex;
		const adjacents = this.getAdjacentIndices(fromSlot);
		if (!adjacents.includes(this.#emptyIndex)) return;

		this.moveTileToEmpty(tile, false);
		this.#moveCount += 1;
		if (!this.#isStarted) this.#isStarted = true;
		this.refreshStatusLabel();
		if (this.isSolved()) {
			this.endGame();
		}
	}

	isSolved() {
		for (let i = 0; i < SIZE * SIZE - 1; ++i) {
			const tile = this.#slotToTile[i];
			if (!tile || tile.value !== i + 1) return false;
		}
		return this.#slotToTile[SIZE * SIZE - 1] === null;
	}

	endGame() {
		this.#isGameOver = true;
		const seconds = System.Math.floor(this.#elapsedSeconds);
		// 점수: 1000 - 이동수*5 - 시간*2, 최저 100
		const score = System.Math.max(100, 1000 - this.#moveCount * 5 - seconds * 2);
		const app = this.getApp();
		app.showResult({
			isWon: true,
			title: "클리어!",
			score,
			stats: [
				`이동: ${this.#moveCount}`,
				`시간: ${seconds}초`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
