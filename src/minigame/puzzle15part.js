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


//==============================================================================
// 타일 노드.
//==============================================================================
class PuzzleTile extends WorldNode {
	/** @type { number } */ value; // 1..15, 0 = 빈칸 (빈칸 타일은 화면에 안 그림)
	/** @private @type { Puzzle15Part } */ #board;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(board, value) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.value = value;
		this.#board = board;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(10);
		this.#label = this.addComponent(Label);
		this.#label.setText("");
		this.#label.setFontSize(80);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.refreshAppearance();
	}

	setValue(value) {
		this.value = value;
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		if (this.value === 0) {
			this.setActive(false);
			return;
		}
		this.setActive(true);
		this.#paint.setColor(Color.createFromHEX(theme.primary));
		this.#label.setText(String(this.value));
		this.#label.setTextColor(Color.createFromHEX(theme.onPrimary));
	}

	setFontSize(size) {
		this.#label.setFontSize(size);
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
	/** @private @type { PuzzleTile[] } */ #tiles;     // 인덱스 = 보드 위치, value = 적힌 숫자
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

		// 보드 인덱스 0..15 위치에 타일 1..15 + 마지막 빈칸.
		for (let i = 0; i < SIZE * SIZE; ++i) {
			const value = (i === SIZE * SIZE - 1) ? 0 : i + 1;
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

		// 정렬 후 셔플.
		for (let i = 0; i < this.#tiles.length; ++i) {
			this.#tiles[i].setValue(i === SIZE * SIZE - 1 ? 0 : i + 1);
		}
		this.#emptyIndex = SIZE * SIZE - 1;

		// 빈 칸을 인접 무작위 방향으로 SHUFFLE_MOVES 번 이동시켜 풀이 가능한 상태 보장.
		let lastFrom = -1;
		for (let i = 0; i < SHUFFLE_MOVES; ++i) {
			const adjacents = this.getAdjacentIndices(this.#emptyIndex).filter(idx => idx !== lastFrom);
			const pick = adjacents[System.Math.floor(System.Math.random() * adjacents.length)];
			lastFrom = this.#emptyIndex;
			this.swap(this.#emptyIndex, pick);
			this.#emptyIndex = pick;
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

	swap(a, b) {
		const va = this.#tiles[a].value;
		const vb = this.#tiles[b].value;
		this.#tiles[a].setValue(vb);
		this.#tiles[b].setValue(va);
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
		for (let i = 0; i < this.#tiles.length; ++i) {
			const tile = this.#tiles[i];
			const row = System.Math.floor(i / SIZE);
			const col = i % SIZE;
			tile.setLocalPosition(Vector2.create(col * (tileSize + TILE_GAP), row * (tileSize + TILE_GAP)));
			tile.setContentSize(Vector2.create(tileSize, tileSize));
			tile.setFontSize(fontSize);
		}

		const buttonY = boardY + boardHeight + verticalGap + buttonHeight * 0.5;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, buttonY));
	}

	onTileTapped(tile) {
		if (this.#isGameOver) return;
		// tile 의 보드 인덱스 찾기.
		const index = this.#tiles.indexOf(tile);
		if (index < 0) return;
		const adjacents = this.getAdjacentIndices(index);
		if (!adjacents.includes(this.#emptyIndex)) return;

		this.swap(index, this.#emptyIndex);
		this.#emptyIndex = index;
		this.#moveCount += 1;
		if (!this.#isStarted) this.#isStarted = true;
		this.refreshStatusLabel();
		if (this.isSolved()) {
			this.endGame();
		}
	}

	isSolved() {
		for (let i = 0; i < SIZE * SIZE - 1; ++i) {
			if (this.#tiles[i].value !== i + 1) return false;
		}
		return this.#tiles[SIZE * SIZE - 1].value === 0;
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
