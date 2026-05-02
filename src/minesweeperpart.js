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
import { createButtonNode, createLabelNode } from "./uihelper.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const COLS = 9;
const ROWS = 9;
const MINE_COUNT = 10;
const LONG_PRESS_THRESHOLD = 0.4;
const TILE_GAP = 4;
const NUMBER_COLORS = [
	"#000000", // 사용 안함.
	"#1a73e8",
	"#2e7d32",
	"#c62828",
	"#5e35b1",
	"#e65100",
	"#00695c",
	"#3e2723",
	"#212121",
];


//==============================================================================
// 타일 노드.
//==============================================================================
class MinesweeperTile extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ row;
	/** @type { number } */ col;
	/** @type { boolean } */ isMine;
	/** @type { boolean } */ isRevealed;
	/** @type { boolean } */ isFlagged;
	/** @type { number } */ neighborCount;
	/** @private @type { boolean } */ #isPressed;
	/** @private @type { number } */ #pressDuration;
	/** @private @type { boolean } */ #longPressTriggered;
	/** @private @type { MinesweeperPart } */ #board;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { MinesweeperPart } board
	 * @param { number } row
	 * @param { number } col
	 */
	constructor(board, row, col) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);

		this.row = row;
		this.col = col;
		this.isMine = false;
		this.isRevealed = false;
		this.isFlagged = false;
		this.neighborCount = 0;
		this.#isPressed = false;
		this.#pressDuration = 0;
		this.#longPressTriggered = false;
		this.#board = board;

		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(8);
		this.#label = this.addComponent(Label);
		this.#label.setFontSize(48);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.#label.setText("");

		this.refreshAppearance();
	}

	//==============================================================================
	// 상태 초기화.
	//==============================================================================
	reset() {
		this.isMine = false;
		this.isRevealed = false;
		this.isFlagged = false;
		this.neighborCount = 0;
		this.#isPressed = false;
		this.#pressDuration = 0;
		this.#longPressTriggered = false;
		this.refreshAppearance();
	}

	//==============================================================================
	// 외관 갱신.
	//==============================================================================
	refreshAppearance() {
		if (this.isRevealed) {
			if (this.isMine) {
				this.#paint.setColor(Color.createFromHEX("#d33b3b"));
				this.#label.setText("*");
				this.#label.setTextColor(Color.createFromHEX("#ffffff"));
			}
			else if (this.neighborCount > 0) {
				this.#paint.setColor(Color.createFromHEX("#e8e3d4"));
				this.#label.setText(String(this.neighborCount));
				this.#label.setTextColor(Color.createFromHEX(NUMBER_COLORS[this.neighborCount]));
			}
			else {
				this.#paint.setColor(Color.createFromHEX("#e8e3d4"));
				this.#label.setText("");
			}
		}
		else if (this.isFlagged) {
			this.#paint.setColor(Color.createFromHEX("#e3a43c"));
			this.#label.setText("F");
			this.#label.setTextColor(Color.createFromHEX("#3a2410"));
		}
		else if (this.#isPressed) {
			this.#paint.setColor(Color.createFromHEX("#5d6a8a"));
			this.#label.setText("");
		}
		else {
			this.#paint.setColor(Color.createFromHEX("#4a5470"));
			this.#label.setText("");
		}
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isPressed) {
			this.#pressDuration += timeDelta;
			if (!this.#longPressTriggered && this.#pressDuration >= LONG_PRESS_THRESHOLD) {
				this.#longPressTriggered = true;
			}
		}
	}

	//==============================================================================
	// 터치 누름.
	//==============================================================================
	touchPress(viewInputPosition) {
		if (this.#board.isInteractionLocked()) {
			return;
		}
		this.#isPressed = true;
		this.#pressDuration = 0;
		this.#longPressTriggered = false;
		this.refreshAppearance();
	}

	//==============================================================================
	// 터치 이동.
	//==============================================================================
	touchMove(viewInputPosition) {
		if (!this.#isPressed) {
			return;
		}
		const inside = this.contains(viewInputPosition);
		if (!inside) {
			this.#isPressed = false;
			this.#pressDuration = 0;
			this.#longPressTriggered = false;
			this.refreshAppearance();
		}
	}

	//==============================================================================
	// 터치 뗌.
	//==============================================================================
	touchRelease(viewInputPosition) {
		if (!this.#isPressed) {
			return;
		}
		const duration = this.#pressDuration;
		const longTriggered = this.#longPressTriggered;
		this.#isPressed = false;
		this.#pressDuration = 0;
		this.#longPressTriggered = false;
		this.refreshAppearance();
		const inside = this.contains(viewInputPosition);
		if (!inside) {
			return;
		}
		this.#board.onTileReleased(this, duration, longTriggered);
	}

	//==============================================================================
	// 터치 취소.
	//==============================================================================
	touchCancel(viewInputPosition) {
		this.#isPressed = false;
		this.#pressDuration = 0;
		this.#longPressTriggered = false;
		this.refreshAppearance();
	}

	//==============================================================================
	// 폰트 크기 설정.
	//==============================================================================
	setFontSize(size) {
		this.#label.setFontSize(size);
	}
}


//==============================================================================
// 지뢰찾기 파트.
//==============================================================================
export class MinesweeperPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { MinesweeperTile[] } */ #tiles;
	/** @private @type { WorldNode } */ #statusLabelNode;
	/** @private @type { Label } */ #statusLabel;
	/** @private @type { WorldNode } */ #messageLabelNode;
	/** @private @type { Label } */ #messageLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { boolean } */ #isWon;
	/** @private @type { number } */ #remainingMines;
	/** @private @type { number } */ #elapsedTime;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#boardNode = null;
		this.#tiles = [];
		this.#statusLabelNode = null;
		this.#statusLabel = null;
		this.#messageLabelNode = null;
		this.#messageLabel = null;
		this.#resetButtonNode = null;
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#isWon = false;
		this.#remainingMines = MINE_COUNT;
		this.#elapsedTime = 0;
	}

	getPartId() {
		return PartId.minesweeper;
	}

	getNavigationTitle() {
		return "지뢰찾기";
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		const background = this.addComponent(Paint);
		background.setColor(Color.createFromHEX("#1d2238"));

		// 상태 표시 라벨.
		this.#statusLabelNode = new WorldNode();
		this.#statusLabelNode.setPivot(Pivot.middleCenter);
		this.#statusLabelNode.setAnchor(Pivot.topLeft);
		this.#statusLabel = this.#statusLabelNode.addComponent(Label);
		this.#statusLabel.setText("");
		this.#statusLabel.setFontSize(48);
		this.#statusLabel.setTextColor(Color.createFromHEX("#e0e6f8"));
		this.#statusLabel.setTextAlign("center");
		this.#statusLabel.setTextBaseline("middle");
		this.addChild(this.#statusLabelNode);

		// 메시지 라벨 (게임 결과).
		this.#messageLabelNode = new WorldNode();
		this.#messageLabelNode.setPivot(Pivot.middleCenter);
		this.#messageLabelNode.setAnchor(Pivot.topLeft);
		this.#messageLabel = this.#messageLabelNode.addComponent(Label);
		this.#messageLabel.setText("");
		this.#messageLabel.setFontSize(60);
		this.#messageLabel.setTextColor(Color.createFromHEX("#ffd66e"));
		this.#messageLabel.setTextAlign("center");
		this.#messageLabel.setTextBaseline("middle");
		this.addChild(this.#messageLabelNode);

		// 보드.
		this.#boardNode = new WorldNode();
		this.#boardNode.setPivot(Pivot.topLeft);
		this.#boardNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#boardNode);

		// 타일들.
		for (let row = 0; row < ROWS; ++row) {
			for (let col = 0; col < COLS; ++col) {
				const tile = new MinesweeperTile(this, row, col);
				this.#boardNode.addChild(tile);
				this.#tiles.push(tile);
			}
		}

		// 리셋 버튼.
		this.#resetButtonNode = createButtonNode(
			"새 게임",
			Vector2.create(360, 120),
			Color.createFromHEX("#5b8def"),
			Color.createFromHEX("#ffffff"),
			48,
			() => { this.resetGame(); },
		);
		this.addChild(this.#resetButtonNode);
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	enter() {
		this.resetGame();
		this.layout();
	}

	//==============================================================================
	// 리사이즈.
	//==============================================================================
	onResize() {
		this.layout();
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isStarted && !this.#isGameOver) {
			this.#elapsedTime += timeDelta;
			this.refreshStatusLabel();
		}
	}

	//==============================================================================
	// 게임 입력 잠금 여부 반환.
	//==============================================================================
	isInteractionLocked() {
		return this.#isGameOver;
	}

	//==============================================================================
	// 게임 리셋.
	//==============================================================================
	resetGame() {
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#isWon = false;
		this.#elapsedTime = 0;
		this.#remainingMines = MINE_COUNT;
		for (const tile of this.#tiles) {
			tile.reset();
		}
		this.#messageLabel.setText("");
		this.refreshStatusLabel();
	}

	//==============================================================================
	// 상태 라벨 갱신.
	//==============================================================================
	refreshStatusLabel() {
		const seconds = System.Math.floor(this.#elapsedTime);
		const text = `남은 지뢰: ${this.#remainingMines}    시간: ${seconds}s`;
		this.#statusLabel.setText(text);
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;

		// 보드 크기 계산.
		const availableWidth = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availableWidth - TILE_GAP * (COLS - 1)) / COLS);
		const boardWidth = tileSize * COLS + TILE_GAP * (COLS - 1);
		const boardHeight = tileSize * ROWS + TILE_GAP * (ROWS - 1);

		// 위/아래 정보 영역.
		const headerHeight = 80;
		const messageHeight = 80;
		const buttonHeight = 120;
		const verticalGap = 24;
		const totalHeight = headerHeight + verticalGap + boardHeight + verticalGap + messageHeight + verticalGap + buttonHeight;
		const top = System.Math.max((contentSize.y - totalHeight) * 0.5, 0);

		// 상태 라벨.
		this.#statusLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerHeight * 0.5));

		// 보드.
		const boardX = (contentSize.x - boardWidth) * 0.5;
		const boardY = top + headerHeight + verticalGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardWidth, boardHeight));

		// 타일.
		const fontSize = System.Math.floor(tileSize * 0.55);
		for (const tile of this.#tiles) {
			const x = tile.col * (tileSize + TILE_GAP);
			const y = tile.row * (tileSize + TILE_GAP);
			tile.setLocalPosition(Vector2.create(x, y));
			tile.setContentSize(Vector2.create(tileSize, tileSize));
			tile.setFontSize(fontSize);
		}

		// 메시지 라벨.
		const messageY = boardY + boardHeight + verticalGap + messageHeight * 0.5;
		this.#messageLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, messageY));

		// 리셋 버튼.
		const buttonY = messageY + messageHeight * 0.5 + verticalGap + buttonHeight * 0.5;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, buttonY));
	}

	//==============================================================================
	// 타일 릴리즈 처리.
	//==============================================================================
	/**
	 * @param { MinesweeperTile } tile
	 * @param { number } duration
	 * @param { boolean } longPressTriggered
	 */
	onTileReleased(tile, duration, longPressTriggered) {
		if (this.#isGameOver) {
			return;
		}
		if (tile.isRevealed) {
			return;
		}

		// 깃발 꽂힌 상태에서 터치하고 떼면 깃발 떼기.
		if (tile.isFlagged) {
			tile.isFlagged = false;
			this.#remainingMines += 1;
			tile.refreshAppearance();
			this.refreshStatusLabel();
			return;
		}

		// 롱터치 = 깃발 꽂기.
		if (longPressTriggered) {
			tile.isFlagged = true;
			this.#remainingMines -= 1;
			tile.refreshAppearance();
			this.refreshStatusLabel();
			return;
		}

		// 숏터치 = 칸 열기.
		if (!this.#isStarted) {
			this.placeMines(tile);
			this.#isStarted = true;
		}
		this.revealTile(tile);
		this.checkWin();
	}

	//==============================================================================
	// 지뢰 배치.
	//==============================================================================
	/**
	 * @param { MinesweeperTile } safeTile
	 */
	placeMines(safeTile) {
		// 첫 클릭과 그 주변은 안전하게 비워둔다.
		const safeSet = new System.Set();
		safeSet.add(safeTile);
		const neighbors = this.getNeighbors(safeTile);
		for (const neighbor of neighbors) {
			safeSet.add(neighbor);
		}

		const candidates = this.#tiles.filter(t => !safeSet.has(t));
		// Fisher-Yates 셔플.
		for (let i = candidates.length - 1; i > 0; --i) {
			const j = System.Math.floor(System.Math.random() * (i + 1));
			const temp = candidates[i];
			candidates[i] = candidates[j];
			candidates[j] = temp;
		}
		const mineCount = System.Math.min(MINE_COUNT, candidates.length);
		for (let i = 0; i < mineCount; ++i) {
			candidates[i].isMine = true;
		}

		// 이웃 지뢰 수 계산.
		for (const tile of this.#tiles) {
			if (tile.isMine) {
				continue;
			}
			const tileNeighbors = this.getNeighbors(tile);
			let count = 0;
			for (const neighbor of tileNeighbors) {
				if (neighbor.isMine) {
					++count;
				}
			}
			tile.neighborCount = count;
		}
	}

	//==============================================================================
	// 이웃 타일 반환.
	//==============================================================================
	/**
	 * @param { MinesweeperTile } tile
	 * @returns { MinesweeperTile[] }
	 */
	getNeighbors(tile) {
		const result = [];
		for (let dr = -1; dr <= 1; ++dr) {
			for (let dc = -1; dc <= 1; ++dc) {
				if (dr === 0 && dc === 0) {
					continue;
				}
				const nr = tile.row + dr;
				const nc = tile.col + dc;
				if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
					continue;
				}
				result.push(this.#tiles[nr * COLS + nc]);
			}
		}
		return result;
	}

	//==============================================================================
	// 타일 열기 (재귀 플러드 필).
	//==============================================================================
	/**
	 * @param { MinesweeperTile } tile
	 */
	revealTile(tile) {
		if (tile.isRevealed || tile.isFlagged) {
			return;
		}
		tile.isRevealed = true;
		tile.refreshAppearance();
		if (tile.isMine) {
			this.#isGameOver = true;
			this.#isWon = false;
			this.revealAllMines();
			this.#messageLabel.setText("게임 오버");
			this.#messageLabel.setTextColor(Color.createFromHEX("#ff8a8a"));
			return;
		}
		if (tile.neighborCount === 0) {
			const neighbors = this.getNeighbors(tile);
			for (const neighbor of neighbors) {
				if (!neighbor.isRevealed && !neighbor.isFlagged) {
					this.revealTile(neighbor);
				}
			}
		}
	}

	//==============================================================================
	// 모든 지뢰 노출.
	//==============================================================================
	revealAllMines() {
		for (const tile of this.#tiles) {
			if (tile.isMine) {
				tile.isRevealed = true;
				tile.isFlagged = false;
				tile.refreshAppearance();
			}
		}
	}

	//==============================================================================
	// 승리 판정.
	//==============================================================================
	checkWin() {
		if (this.#isGameOver) {
			return;
		}
		for (const tile of this.#tiles) {
			if (!tile.isMine && !tile.isRevealed) {
				return;
			}
		}
		this.#isGameOver = true;
		this.#isWon = true;
		this.#messageLabel.setText("승리!");
		this.#messageLabel.setTextColor(Color.createFromHEX("#9be38a"));
	}
}
