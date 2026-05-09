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
import { addStars, addClear, getPlayCount, getClearCount } from "../scoreboard.js";
import { getGameIdForPartId } from "../gamescatalog.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const SIZE = 4;
const TILE_GAP = 6;
const SHUFFLE_MOVES = 80;
// 슬라이드 보간 계수. 값이 클수록 빠르게 수렴 (지수 감쇠 lerp 의 시정수 ≈ 1/SLIDE_RATE 초).
const SLIDE_RATE = 18;
const SLIDE_SNAP_PIXELS = 0.5;
// 위치 정답 시 숫자 색.
const CORRECT_TEXT_COLOR_HEX = "#ffd700";


//==============================================================================
// 타일 노드.
// - value 는 1..15 (생성 후 불변), 빈 슬롯에는 별도 타일이 없다.
// - slotIndex 는 현재 슬롯 위치 (0..15). 보드가 갱신해주는 값.
// - currentX/Y 는 실제 그려지는 위치, targetX/Y 로 매 tick 보간돼서 부드럽게 이동.
// - 드래그 모드: 인접 빈 슬롯 방향으로만 이동. 절반 이상 이동 시 빈 슬롯으로 commit,
//   이하이면 원래 슬롯으로 snap-back.
//==============================================================================
class PuzzleTile extends WorldNode {
	/** @type { number } */ value;
	/** @type { number } */ slotIndex;
	/** @private @type { Puzzle15Part } */ #board;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;
	/** @private @type { number } */ #currentX;
	/** @private @type { number } */ #currentY;
	/** @private @type { number } */ #targetX;
	/** @private @type { number } */ #targetY;
	/** @private @type { boolean } */ #isAnimating;
	/** @private @type { boolean } */ #isDragging;
	/** @private @type { string } */ #dragAxis;
	/** @private @type { number } */ #dragSign;
	/** @private @type { number } */ #dragMaxOffset;
	/** @private @type { number } */ #dragSlotPixelX;
	/** @private @type { number } */ #dragSlotPixelY;
	/** @private @type { number } */ #dragStartViewX;
	/** @private @type { number } */ #dragStartViewY;

	//==============================================================================
	// constructor.
	//==============================================================================
	/**
	 * @param { * } board
	 * @param { * } value
	 */
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
		this.#isDragging = false;
		this.#dragAxis = "x";
		this.#dragSign = 1;
		this.#dragMaxOffset = 0;
		this.#dragSlotPixelX = 0;
		this.#dragSlotPixelY = 0;
		this.#dragStartViewX = 0;
		this.#dragStartViewY = 0;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(10);
		this.#text = this.addComponent(Text);
		this.#text.setText(String(value));
		this.#text.setFontSize(80);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.refreshAppearance();
	}

	//==============================================================================
	// refreshAppearance.
	// - 위치가 정답(value === slotIndex+1)이면 숫자 색을 황금색으로, 아니면 onPrimary(흰색).
	//==============================================================================
	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.primary));
		const isCorrectSlot = this.value === this.slotIndex + 1;
		const textColorHex = isCorrectSlot ? CORRECT_TEXT_COLOR_HEX : theme.onPrimary;
		this.#text.setTextColor(Color.createFromHEX(textColorHex));
	}

	//==============================================================================
	// setFontSize.
	//==============================================================================
	/**
	 * @param { * } size
	 */
	setFontSize(size) {
		this.#text.setFontSize(size);
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
		this.refreshAppearance();
	}

	//==============================================================================
	// 드래그 중인지 여부.
	//==============================================================================
	isDragging() {
		return this.#isDragging;
	}

	//==============================================================================
	// 드래그 강제 취소. (보드가 외부에서 종료시킬 때)
	//==============================================================================
	cancelDrag() {
		if (!this.#isDragging) {
			return;
		}
		this.#isDragging = false;
		this.#targetX = this.#dragSlotPixelX;
		this.#targetY = this.#dragSlotPixelY;
		this.#isAnimating = true;
	}

	//==============================================================================
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isDragging) {
			return;
		}
		if (!this.#isAnimating) {
			return;
		}
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

	//==============================================================================
	// touchPress.
	// - 인접 빈 슬롯이 있으면 그 방향으로의 드래그 시작. 없으면 무반응.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchPress(viewInputPosition) {
		// (구) 탭하면 빈 슬롯으로 이동하는 모드 - 드래그 모드로 대체.
		// if (!this.contains(viewInputPosition)) return;
		// this.#board.onTileTapped(this);

		if (!this.#board.isInputEnabled()) {
			return;
		}
		const direction = this.#board.getEmptyDirection(this);
		if (!direction) {
			return;
		}
		this.#isDragging = true;
		this.#dragAxis = direction.axis;
		this.#dragSign = direction.sign;
		this.#dragMaxOffset = direction.distance;
		this.#dragSlotPixelX = this.#board.slotToPixelX(this.slotIndex);
		this.#dragSlotPixelY = this.#board.slotToPixelY(this.slotIndex);
		this.#dragStartViewX = viewInputPosition.x;
		this.#dragStartViewY = viewInputPosition.y;
		this.#isAnimating = false;
		this.#currentX = this.#dragSlotPixelX;
		this.#currentY = this.#dragSlotPixelY;
		this.setLocalPosition(Vector2.create(this.#currentX, this.#currentY));
	}

	//==============================================================================
	// touchMove.
	// - 드래그 축 방향으로만 이동. [0, dragMaxOffset] 으로 클램프.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchMove(viewInputPosition) {
		if (!this.#isDragging) {
			return;
		}
		const offset = this.#computeOffset(viewInputPosition);
		let pixelX = this.#dragSlotPixelX;
		let pixelY = this.#dragSlotPixelY;
		if (this.#dragAxis === "x") {
			pixelX += offset * this.#dragSign;
		}
		else {
			pixelY += offset * this.#dragSign;
		}
		this.#currentX = pixelX;
		this.#currentY = pixelY;
		this.setLocalPosition(Vector2.create(pixelX, pixelY));
	}

	//==============================================================================
	// touchRelease.
	// - 절반 이상 이동 시 commit (빈 슬롯으로 슬라이드 완료).
	// - 절반 이하 시 snap-back (원래 슬롯으로 복귀).
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchRelease(viewInputPosition) {
		if (!this.#isDragging) {
			return;
		}
		this.#isDragging = false;
		const offset = this.#computeOffset(viewInputPosition);
		const half = this.#dragMaxOffset * 0.5;
		if (offset >= half) {
			this.#board.commitTileMove(this);
		}
		else {
			this.#targetX = this.#dragSlotPixelX;
			this.#targetY = this.#dragSlotPixelY;
			this.#isAnimating = true;
		}
	}

	//==============================================================================
	// touchCancel.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchCancel(viewInputPosition) {
		if (!this.#isDragging) {
			return;
		}
		this.#isDragging = false;
		this.#targetX = this.#dragSlotPixelX;
		this.#targetY = this.#dragSlotPixelY;
		this.#isAnimating = true;
	}

	//==============================================================================
	// 시작 지점 대비 드래그 축 방향 오프셋 계산. (음수 → 0, 최대 → dragMaxOffset)
	//==============================================================================
	#computeOffset(viewInputPosition) {
		let raw = 0;
		if (this.#dragAxis === "x") {
			raw = (viewInputPosition.x - this.#dragStartViewX) * this.#dragSign;
		}
		else {
			raw = (viewInputPosition.y - this.#dragStartViewY) * this.#dragSign;
		}
		if (raw < 0) {
			return 0;
		}
		if (raw > this.#dragMaxOffset) {
			return this.#dragMaxOffset;
		}
		return raw;
	}
}


//==============================================================================
// 슬라이딩 퍼즐 파트.
//==============================================================================
export class Puzzle15Part extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { PuzzleTile[] } */ #tiles;            // value 1..15 의 영구 노드 배열.
	/** @private @type { Array<PuzzleTile|null> } */ #slotToTile; // 슬롯 인덱스 → 타일(없으면 null).
	/** @private @type { number } */ #emptyIndex;
	/** @private @type { WorldNode } */ #statusTextNode;
	/** @private @type { Text } */ #statusText;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #elapsedSeconds;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { number } */ #tileSize;
	/** @private @type { number } */ #boardX;
	/** @private @type { number } */ #boardY;

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.#tiles = [];
		this.#slotToTile = new Array(SIZE * SIZE).fill(null);
		this.#emptyIndex = SIZE * SIZE - 1;
		this.#elapsedSeconds = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#tileSize = 0;
		this.#boardX = 0;
		this.#boardY = 0;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.puzzle15; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "4x4 슬라이딩 퍼즐"; }
	//==============================================================================
	// getNavigationBackIcon.
	//==============================================================================
	getNavigationBackIcon() { return "❌"; }

	//==============================================================================
	// shouldConfirmExit.
	//==============================================================================
	shouldConfirmExit() {
		return this.#isStarted && !this.#isGameOver;
	}
	//==============================================================================
	// getExitConfirmMessage.
	//==============================================================================
	getExitConfirmMessage() {
		return "현재 게임을 그만두시겠습니까?";
	}

	//==============================================================================
	// 입력 가능 여부. (게임 오버 시 드래그 비활성)
	//==============================================================================
	isInputEnabled() {
		return !this.#isGameOver;
	}

	//==============================================================================
	// onBuild.
	//==============================================================================
	onBuild() {
		this.setupBackground();

		this.#statusTextNode = new WorldNode();
		this.#statusTextNode.setPivot(Pivot.middleCenter);
		this.#statusTextNode.setAnchor(Pivot.topLeft);
		this.#statusText = this.#statusTextNode.addComponent(Text);
		this.#statusText.setFontSize(44);
		this.#statusText.setTextAlign("center");
		this.#statusText.setTextBaseline("middle");
		this.#statusText.setText("");
		this.addChild(this.#statusTextNode);

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
		this.#resetButtonText = this.#resetButtonNode.getComponent(Text);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	//==============================================================================
	// enter.
	//==============================================================================
	enter() {
		this.resetGame();
		this.layout();
	}

	//==============================================================================
	// onResize.
	//==============================================================================
	onResize() {
		this.layout();
	}

	//==============================================================================
	// applyTheme.
	//==============================================================================
	/**
	 * @param { * } theme
	 */
	applyTheme(theme) {
	}

	//==============================================================================
	// applyGameTheme.
	//==============================================================================
	/**
	 * @param { * } theme
	 */
	applyGameTheme(theme) {
		const backgroundPaint = this.getBackgroundPaint();
		if (backgroundPaint) {
			backgroundPaint.setColor(Color.createFromHEX(theme.background));
		}
		if (this.#statusText) {
			this.#statusText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resetButtonPaint) {
			this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		}
		if (this.#resetButtonText) {
			this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		for (const tile of this.#tiles) {
			tile.refreshAppearance();
		}
	}

	//==============================================================================
	// resetGame.
	//==============================================================================
	resetGame() {
		this.#elapsedSeconds = 0;
		this.#isStarted = false;
		this.#isGameOver = false;

		// 진행 중이던 드래그 강제 취소.
		for (const tile of this.#tiles) {
			tile.cancelDrag();
		}

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
		this.refreshStatusText();
		// 셔플 직후 풀린 상태면 한 번 더.
		if (this.isSolved()) {
			this.resetGame();
		}
	}

	//==============================================================================
	// refreshStatusText.
	//==============================================================================
	refreshStatusText() {
		const seconds = System.Math.floor(this.#elapsedSeconds);
		this.#statusText.setText(`흐른 시간: ${seconds}초`);
	}

	//==============================================================================
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isStarted && !this.#isGameOver) {
			this.#elapsedSeconds += timeDelta;
			this.refreshStatusText();
		}
	}

	//==============================================================================
	// getAdjacentIndices.
	//==============================================================================
	/**
	 * @param { * } index
	 */
	getAdjacentIndices(index) {
		const row = System.Math.floor(index / SIZE);
		const col = index % SIZE;
		const out = [];
		if (row > 0) {
			out.push((row - 1) * SIZE + col);
		}
		if (row < SIZE - 1) {
			out.push((row + 1) * SIZE + col);
		}
		if (col > 0) {
			out.push(row * SIZE + (col - 1));
		}
		if (col < SIZE - 1) {
			out.push(row * SIZE + (col + 1));
		}		return out;
	}

	//==============================================================================
	// 타일에서 인접 빈 슬롯이 있는지, 있다면 그 방향과 거리 반환.
	// - axis: "x" or "y", sign: ±1, distance: tileSize + TILE_GAP. 없으면 null.
	//==============================================================================
	getEmptyDirection(tile) {
		if (!tile) {
			return null;
		}
		const tileRow = System.Math.floor(tile.slotIndex / SIZE);
		const tileCol = tile.slotIndex % SIZE;
		const emptyRow = System.Math.floor(this.#emptyIndex / SIZE);
		const emptyCol = this.#emptyIndex % SIZE;
		const distance = this.#tileSize + TILE_GAP;
		if (tileRow === emptyRow && System.Math.abs(tileCol - emptyCol) === 1) {
			return { axis: "x", sign: emptyCol > tileCol ? 1 : -1, distance: distance };
		}
		if (tileCol === emptyCol && System.Math.abs(tileRow - emptyRow) === 1) {
			return { axis: "y", sign: emptyRow > tileRow ? 1 : -1, distance: distance };
		}
		return null;
	}

	//==============================================================================
	// 슬롯 인덱스의 픽셀 좌상단 좌표.
	//==============================================================================
	slotToPixelX(slotIndex) {
		return (slotIndex % SIZE) * (this.#tileSize + TILE_GAP);
	}
	//==============================================================================
	// slotToPixelY.
	//==============================================================================
	/**
	 * @param { * } slotIndex
	 */
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

	//==============================================================================
	// 드래그 commit. (절반 이상 이동된 타일을 빈 슬롯으로 확정 이동)
	//==============================================================================
	commitTileMove(tile) {
		if (this.#isGameOver) {
			return;
		}
		// 인접 빈 슬롯이 여전히 유효한지 재확인 (드래그 중 보드 상태가 바뀔 일은 없지만 방어적).
		const direction = this.getEmptyDirection(tile);
		if (!direction) {
			return;
		}
		this.moveTileToEmpty(tile, false);
		if (!this.#isStarted) {
			this.#isStarted = true;
		}
		this.refreshStatusText();
		if (this.isSolved()) {
			this.endGame();
		}
	}

	//==============================================================================
	// layout.
	//==============================================================================
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

		this.#statusTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerHeight * 0.5));

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

	//==============================================================================
	// isSolved.
	//==============================================================================
	isSolved() {
		for (let i = 0; i < SIZE * SIZE - 1; ++i) {
			const tile = this.#slotToTile[i];
			if (!tile || tile.value !== i + 1) {
				return false;
			}
		}
		return this.#slotToTile[SIZE * SIZE - 1] === null;
	}

	//==============================================================================
	// endGame.
	// - 클리어 카운트 +1, 별 +1 지급. 결과 팝업은 점수 없이 플레이/클리어 횟수만 표시.
	//==============================================================================
	endGame() {
		this.#isGameOver = true;
		const gameId = getGameIdForPartId(this.getPartId());
		if (gameId) {
			addClear(gameId);
			addStars(gameId, 1);
		}
		const playCount = gameId ? getPlayCount(gameId) : 0;
		// showResult 가 호출되면서 playCount 가 +1 가산되므로, 사용자에게는 "이번 플레이 포함" 의 값을 보이도록 +1 미리 반영.
		const displayPlayCount = playCount + 1;
		const clearCount = gameId ? getClearCount(gameId) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: true,
			title: "클리어!",
			stats: [
				`플레이 횟수: ${displayPlayCount}`,
				`다맞춘 횟수: ${clearCount}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
