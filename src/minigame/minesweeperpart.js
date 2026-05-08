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
import { createButtonNode, createTextNode, markUseSystemFont } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const COLS = 9;
const ROWS = 9;
const MINE_COUNT = 10;
const INITIAL_TIME = 999;             // 카운트다운 시작 시간(초)
const LONG_PRESS_THRESHOLD = 0.4;
const TILE_GAP = 4;

const FLAG_EMOJI = "🚩";
const MINE_EMOJI = "💣";

const NUMBER_COLORS = [
	"#000000",
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
// 남은 시간(초)에 따른 점수 배수. 1~10.
//==============================================================================
function getTimeMultiplier(remainingSeconds) {
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 900) {
		return 10;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 800) {
		return 9;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 700) {
		return 8;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 600) {
		return 7;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 500) {
		return 6;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 400) {
		return 5;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 300) {
		return 4;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 200) {
		return 3;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } remainingSeconds >
	 */
	if (remainingSeconds >= 100) {
		return 2;
	}	return 1;
}


//==============================================================================
// hex 색에 alpha 를 곱해 새 Color 반환. (간단 mix 용)
//==============================================================================
function blendColor(hex, baseHex, alpha) {
	const fg = Color.createFromHEX(hex);
	const bg = Color.createFromHEX(baseHex);
	const r = bg.red + (fg.red - bg.red) * alpha;
	const g = bg.green + (fg.green - bg.green) * alpha;
	const b = bg.blue + (fg.blue - bg.blue) * alpha;
	return new Color(r, g, b, 1);
}


//==============================================================================
// 타일 노드.
//==============================================================================
class MinesweeperTile extends WorldNode {
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
	/** @private @type { Text } */ #text;

	//==============================================================================
	// constructor.
	//==============================================================================
	/**
	 * @param { * } board
	 * @param { * } row
	 * @param { * } col
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
		this.#text = this.addComponent(Text);
		this.#text.setFontSize(48);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.#text.setText("");
		markUseSystemFont(this.#text);

		this.refreshAppearance();
	}

	//==============================================================================
	// reset.
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
	// refreshAppearance.
	//==============================================================================
	refreshAppearance() {
		const theme = getCurrentGameTheme();

		if (this.isRevealed) {
			if (this.isMine) {
				this.#paint.setColor(Color.createFromHEX(theme.error));
				this.#text.setText(MINE_EMOJI);
				this.#text.setTextColor(Color.createFromHEX(theme.onError));
			}
			else if (this.neighborCount > 0) {
				this.#paint.setColor(Color.createFromHEX(theme.surface));
				this.#text.setText(String(this.neighborCount));
				this.#text.setTextColor(Color.createFromHEX(NUMBER_COLORS[this.neighborCount]));
			}
			else {
				this.#paint.setColor(Color.createFromHEX(theme.surface));
				this.#text.setText("");
			}
		}
		else if (this.isFlagged) {
			this.#paint.setColor(Color.createFromHEX(theme.secondary));
			this.#text.setText(FLAG_EMOJI);
			this.#text.setTextColor(Color.createFromHEX(theme.onSecondary));
		}
		else if (this.#isPressed && this.#longPressTriggered) {
			// 깃발이 부족할 때는 미리보기 안 함 (board 가 결정).
			if (this.#board.canPlaceFlag()) {
				this.#paint.setColor(Color.createFromHEX(theme.secondary));
				this.#text.setText(FLAG_EMOJI);
				this.#text.setTextColor(Color.createFromHEX(theme.onSecondary));
			}
			else {
				this.#paint.setColor(blendColor(theme.error, theme.surfaceVariant, 0.5));
				this.#text.setText("");
			}
		}
		else if (this.#isPressed) {
			this.#paint.setColor(blendColor(theme.primary, theme.surfaceVariant, 0.5));
			this.#text.setText("");
		}
		else {
			this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
			this.#text.setText("");
		}
	}

	//==============================================================================
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isPressed) {
			this.#pressDuration += timeDelta;
			if (!this.#longPressTriggered && this.#pressDuration >= LONG_PRESS_THRESHOLD) {
				this.#longPressTriggered = true;
				this.refreshAppearance();
			}
		}
	}

	//==============================================================================
	// touchPress.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
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
	// touchMove.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
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
	// touchRelease.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchRelease(viewInputPosition) {
		if (!this.#isPressed) {
			return;
		}
		const longTriggered = this.#longPressTriggered;
		this.#isPressed = false;
		this.#pressDuration = 0;
		this.#longPressTriggered = false;
		this.refreshAppearance();
		const inside = this.contains(viewInputPosition);
		if (!inside) {
			return;
		}
		this.#board.onTileReleased(this, longTriggered);
	}

	//==============================================================================
	// touchCancel.
	//==============================================================================
	/**
	 * @param { * } viewInputPosition
	 */
	touchCancel(viewInputPosition) {
		this.#isPressed = false;
		this.#pressDuration = 0;
		this.#longPressTriggered = false;
		this.refreshAppearance();
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
}


//==============================================================================
// 지뢰찾기 파트.
//==============================================================================
export class MinesweeperPart extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { MinesweeperTile[] } */ #tiles;
	/** @private @type { WorldNode } */ #statusTextNode;
	/** @private @type { Text } */ #statusText;
	/** @private @type { WorldNode } */ #messageTextNode;
	/** @private @type { Text } */ #messageText;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { boolean } */ #isWon;
	/** @private @type { number } */ #remainingFlags; // 남은 깃발 수 (회복 안 됨)
	/** @private @type { number } */ #remainingTime;  // 남은 시간(초)

	//==============================================================================
	// constructor.
	//==============================================================================
	constructor() {
		super();
		this.#boardNode = null;
		this.#tiles = [];
		this.#statusTextNode = null;
		this.#statusText = null;
		this.#messageTextNode = null;
		this.#messageText = null;
		this.#resetButtonNode = null;
		this.#resetButtonPaint = null;
		this.#resetButtonText = null;
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#isWon = false;
		this.#remainingFlags = MINE_COUNT;
		this.#remainingTime = INITIAL_TIME;

		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.minesweeper; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "지뢰찾기"; }
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
	// 깃발을 더 꽂을 수 있는지.
	//==============================================================================
	canPlaceFlag() {
		return this.#remainingFlags > 0;
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		this.setupBackground();

		this.#statusTextNode = new WorldNode();
		this.#statusTextNode.setPivot(Pivot.middleCenter);
		this.#statusTextNode.setAnchor(Pivot.topLeft);
		this.#statusText = this.#statusTextNode.addComponent(Text);
		this.#statusText.setText("");
		this.#statusText.setFontSize(44);
		this.#statusText.setTextAlign("center");
		this.#statusText.setTextBaseline("middle");
		this.addChild(this.#statusTextNode);

		this.#messageTextNode = new WorldNode();
		this.#messageTextNode.setPivot(Pivot.middleCenter);
		this.#messageTextNode.setAnchor(Pivot.topLeft);
		this.#messageText = this.#messageTextNode.addComponent(Text);
		this.#messageText.setText("");
		this.#messageText.setFontSize(60);
		this.#messageText.setTextAlign("center");
		this.#messageText.setTextBaseline("middle");
		this.addChild(this.#messageTextNode);

		this.#boardNode = new WorldNode();
		this.#boardNode.setPivot(Pivot.topLeft);
		this.#boardNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#boardNode);

		for (let row = 0; row < ROWS; ++row) {
			for (let col = 0; col < COLS; ++col) {
				const tile = new MinesweeperTile(this, row, col);
				this.#boardNode.addChild(tile);
				this.#tiles.push(tile);
			}
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
		// UI 테마 무시. 게임 테마로만 색 결정.
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
		if (this.#messageText) {
			const messageColor = this.#isGameOver
				? (this.#isWon ? theme.primary : theme.error)
				: theme.onBackground;
			this.#messageText.setTextColor(Color.createFromHEX(messageColor));
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
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isStarted && !this.#isGameOver) {
			this.#remainingTime -= timeDelta;
			if (this.#remainingTime <= 0) {
				this.#remainingTime = 0;
				this.refreshStatusText();
				this.endGame(false, "시간 초과");
				return;
			}
			this.refreshStatusText();
		}
	}

	//==============================================================================
	// isInteractionLocked.
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
		this.#remainingFlags = MINE_COUNT;
		this.#remainingTime = INITIAL_TIME;
		for (const tile of this.#tiles) {
			tile.reset();
		}
		this.#messageText.setText("");
		this.#messageText.setTextColor(Color.createFromHEX(getCurrentGameTheme().onBackground));
		this.refreshStatusText();
	}

	//==============================================================================
	// 상태 라벨 갱신. ("남은 깃발: K    시간: T초")
	//==============================================================================
	refreshStatusText() {
		const seconds = System.Math.ceil(this.#remainingTime);
		const text = `남은 깃발: ${this.#remainingFlags}    시간: ${seconds}초`;
		this.#statusText.setText(text);
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const availableWidth = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availableWidth - TILE_GAP * (COLS - 1)) / COLS);
		const boardWidth = tileSize * COLS + TILE_GAP * (COLS - 1);
		const boardHeight = tileSize * ROWS + TILE_GAP * (ROWS - 1);

		const headerHeight = 80;
		const messageHeight = 80;
		const buttonHeight = 120;
		const verticalGap = 24;
		const totalHeight = headerHeight + verticalGap + boardHeight + verticalGap + messageHeight + verticalGap + buttonHeight;
		const top = System.Math.max((contentSize.y - totalHeight) * 0.5, 0);

		this.#statusTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerHeight * 0.5));

		const boardX = (contentSize.x - boardWidth) * 0.5;
		const boardY = top + headerHeight + verticalGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardWidth, boardHeight));

		const fontSize = System.Math.floor(tileSize * 0.55);
		for (const tile of this.#tiles) {
			const x = tile.col * (tileSize + TILE_GAP);
			const y = tile.row * (tileSize + TILE_GAP);
			tile.setLocalPosition(Vector2.create(x, y));
			tile.setContentSize(Vector2.create(tileSize, tileSize));
			tile.setFontSize(fontSize);
		}

		const messageY = boardY + boardHeight + verticalGap + messageHeight * 0.5;
		this.#messageTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, messageY));

		const buttonY = messageY + messageHeight * 0.5 + verticalGap + buttonHeight * 0.5;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, buttonY));
	}

	//==============================================================================
	// 타일 릴리즈 처리.
	//==============================================================================
	onTileReleased(tile, longPressTriggered) {
		if (this.#isGameOver) {
			return;
		}
		if (tile.isRevealed) {
			return;
		}

		// 깃발 꽂힌 칸을 누르면 → 확인 팝업 → 깃발 제거 + 칸 열기.
		// (소모된 깃발은 회복되지 않음)
		if (tile.isFlagged) {
			const app = this.getApp();
			app.showConfirm(
				"깃발을 제거하고 칸을 열까요?",
				() => { this.openFlaggedTile(tile); },
				null,
				{
					yesText: "열기",
					noText: "취소",
					subMessage: "소모된 깃발은 돌아오지 않습니다.",
				},
			);
			return;
		}

		// 롱프레스 → 깃발. 단 남은 깃발이 있어야.
		if (longPressTriggered) {
			if (this.#remainingFlags <= 0) {
				return;
			}
			tile.isFlagged = true;
			this.#remainingFlags -= 1;
			tile.refreshAppearance();
			this.refreshStatusText();
			return;
		}

		// 숏 탭 → 칸 열기.
		if (!this.#isStarted) {
			this.placeMines(tile);
			this.#isStarted = true;
		}
		this.revealTile(tile);
		this.checkWin();
	}

	//==============================================================================
	// 깃발이 꽂힌 칸을 (확인 후) 강제로 여는 처리.
	//==============================================================================
	openFlaggedTile(tile) {
		if (this.#isGameOver || tile.isRevealed) {
			return;
		}
		tile.isFlagged = false;
		// remainingFlags 는 회복하지 않음.
		tile.refreshAppearance();
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
	placeMines(safeTile) {
		const safeSet = new System.Set();
		safeSet.add(safeTile);
		const neighbors = this.getNeighbors(safeTile);
		for (const n of neighbors) safeSet.add(n);

		const candidates = this.#tiles.filter(t => !safeSet.has(t));
		for (let i = candidates.length - 1; i > 0; --i) {
			const j = System.Math.floor(System.Math.random() * (i + 1));
			const tmp = candidates[i];
			candidates[i] = candidates[j];
			candidates[j] = tmp;
		}
		const mineCount = System.Math.min(MINE_COUNT, candidates.length);
		for (let i = 0; i < mineCount; ++i) {
			candidates[i].isMine = true;
		}
		for (const tile of this.#tiles) {
			if (tile.isMine) {
				continue;
			}			let count = 0;
			for (const n of this.getNeighbors(tile)) {
				if (n.isMine) {
					++count;
				}
			}
			tile.neighborCount = count;
		}
	}

	//==============================================================================
	// getNeighbors.
	//==============================================================================
	/**
	 * @param { * } tile
	 */
	getNeighbors(tile) {
		const result = [];
		for (let dr = -1; dr <= 1; ++dr) {
			for (let dc = -1; dc <= 1; ++dc) {
				if (dr === 0 && dc === 0) {
					continue;
				}				const nr = tile.row + dr;
				const nc = tile.col + dc;
				if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
					continue;
				}				result.push(this.#tiles[nr * COLS + nc]);
			}
		}
		return result;
	}

	//==============================================================================
	// revealTile.
	//==============================================================================
	/**
	 * @param { * } tile
	 */
	revealTile(tile) {
		if (tile.isRevealed || tile.isFlagged) {
			return;
		}
		tile.isRevealed = true;
		tile.refreshAppearance();
		if (tile.isMine) {
			this.endGame(false, "지뢰 폭발");
			return;
		}
		if (tile.neighborCount === 0) {
			for (const n of this.getNeighbors(tile)) {
				if (!n.isRevealed && !n.isFlagged) {
					this.revealTile(n);
				}
			}
		}
	}

	//==============================================================================
	// revealAllMines.
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
	// checkWin.
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
		this.endGame(true, "승리!");
	}

	//==============================================================================
	// 게임 종료. (점수 계산 + 결과 팝업)
	//==============================================================================
	endGame(isWon, mainMessage) {
		this.#isGameOver = true;
		this.#isWon = isWon;
		if (!isWon) {
			this.revealAllMines();
		}

		// 통계.
		let correctFlags = 0;
		let wrongFlags = 0;
		let unflaggedMines = 0;
		for (const tile of this.#tiles) {
			if (tile.isFlagged && tile.isMine) {
				correctFlags += 1;
			}			else if (tile.isFlagged && !tile.isMine) wrongFlags += 1;
			else if (!tile.isFlagged && tile.isMine && !tile.isRevealed) unflaggedMines += 1;
		}

		const remainingSeconds = System.Math.max(0, System.Math.ceil(this.#remainingTime));
		const multiplier = getTimeMultiplier(remainingSeconds);
		const baseScore = correctFlags + unflaggedMines - wrongFlags;
		const score = isWon ? System.Math.max(0, multiplier * baseScore) : 0;

		// 메시지 라벨에도 결과 표시.
		this.#messageText.setText(`${mainMessage} (점수 ${score})`);
		const theme = getCurrentGameTheme();
		this.#messageText.setTextColor(Color.createFromHEX(isWon ? theme.primary : theme.error));

		// 결과 팝업. (메시지팝업이 아닌 전용 ResultPopup 사용)
		const app = this.getApp();
		app.showResult({
			isWon,
			title: mainMessage,
			score,
			stats: [
				`남은 시간: ${remainingSeconds}초  (점수 배수 ×${multiplier})`,
				`정답 깃발: ${correctFlags}`,
				`오답 깃발: ${wrongFlags}`,
				`미공개 지뢰: ${unflaggedMines}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
