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
import { createButtonNode, markUseSystemFont } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const SIZE = 3;
const TILE_GAP = 8;
const PLAYER_MARK = "O";
const AI_MARK = "X";


//==============================================================================
// 셀 노드.
//==============================================================================
class TicTacToeCell extends WorldNode {
	/** @type { number } */ index;
	/** @type { string } */ mark;
	/** @private @type { TicTacToePart } */ #board;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(board, index) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.index = index;
		this.mark = "";
		this.#board = board;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(12);
		this.#label = this.addComponent(Label);
		this.#label.setText("");
		this.#label.setFontSize(120);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		markUseSystemFont(this.#label);
		this.refreshAppearance();
	}

	reset() {
		this.mark = "";
		this.refreshAppearance();
	}

	setMark(mark) {
		this.mark = mark;
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
		this.#label.setText(this.mark);
		if (this.mark === PLAYER_MARK) {
			this.#label.setTextColor(Color.createFromHEX(theme.primary));
		}
		else if (this.mark === AI_MARK) {
			this.#label.setTextColor(Color.createFromHEX(theme.error));
		}
		else {
			this.#label.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	setFontSize(size) {
		this.#label.setFontSize(size);
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#board.onCellTapped(this);
	}
}


//==============================================================================
// 틱택토 파트.
//==============================================================================
export class TicTacToePart extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { TicTacToeCell[] } */ #cells;
	/** @private @type { WorldNode } */ #statusLabelNode;
	/** @private @type { Label } */ #statusLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { boolean } */ #isPlayerTurn;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { number } */ #moveCount;

	constructor() {
		super();
		this.#cells = [];
		this.#isPlayerTurn = true;
		this.#isGameOver = false;
		this.#moveCount = 0;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.ticTacToe; }
	getNavigationTitle() { return "틱택토"; }
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
		this.#statusLabel.setFontSize(48);
		this.#statusLabel.setTextAlign("center");
		this.#statusLabel.setTextBaseline("middle");
		this.#statusLabel.setText("");
		this.addChild(this.#statusLabelNode);

		this.#boardNode = new WorldNode();
		this.#boardNode.setPivot(Pivot.topLeft);
		this.#boardNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#boardNode);

		for (let i = 0; i < SIZE * SIZE; ++i) {
			const cell = new TicTacToeCell(this, i);
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
		this.#isPlayerTurn = true;
		this.#isGameOver = false;
		this.#moveCount = 0;
		for (const cell of this.#cells) {
			cell.reset();
		}
		this.refreshStatusLabel();
	}

	refreshStatusLabel() {
		if (this.#isGameOver) return;
		this.#statusLabel.setText(this.#isPlayerTurn ? "당신 차례 (O)" : "AI 차례 (X)");
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 60;
		const availableWidth = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availableWidth - TILE_GAP * (SIZE - 1)) / SIZE);
		const boardWidth = tileSize * SIZE + TILE_GAP * (SIZE - 1);
		const boardHeight = tileSize * SIZE + TILE_GAP * (SIZE - 1);

		const headerHeight = 100;
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
		if (!this.#isPlayerTurn) return;
		if (cell.mark !== "") return;
		cell.setMark(PLAYER_MARK);
		this.#moveCount += 1;
		if (this.evaluate(PLAYER_MARK, "승리!")) return;
		this.#isPlayerTurn = false;
		this.refreshStatusLabel();
		this.aiMove();
	}

	aiMove() {
		if (this.#isGameOver) return;
		// 간단한 AI: 1) 이길 수 있으면 이긴다. 2) 막을 수 있으면 막는다. 3) 가운데 → 모서리 → 변.
		const empties = [];
		for (let i = 0; i < this.#cells.length; ++i) {
			if (this.#cells[i].mark === "") empties.push(i);
		}
		if (empties.length === 0) return;

		let move = this.findWinningMove(AI_MARK);
		if (move < 0) move = this.findWinningMove(PLAYER_MARK);
		if (move < 0 && this.#cells[4].mark === "") move = 4;
		if (move < 0) {
			const corners = [0, 2, 6, 8].filter(i => this.#cells[i].mark === "");
			if (corners.length > 0) move = corners[System.Math.floor(System.Math.random() * corners.length)];
		}
		if (move < 0) {
			move = empties[System.Math.floor(System.Math.random() * empties.length)];
		}

		this.#cells[move].setMark(AI_MARK);
		this.#moveCount += 1;
		if (this.evaluate(AI_MARK, "패배...")) return;
		this.#isPlayerTurn = true;
		this.refreshStatusLabel();
	}

	//==============================================================================
	// mark 가 한 수로 이길 수 있는 칸 인덱스 반환. 없으면 -1.
	//==============================================================================
	findWinningMove(mark) {
		const lines = this.getWinLines();
		for (const line of lines) {
			let countMark = 0;
			let emptyIndex = -1;
			for (const i of line) {
				if (this.#cells[i].mark === mark) countMark += 1;
				else if (this.#cells[i].mark === "") emptyIndex = i;
				else { countMark = -1; break; }
			}
			if (countMark === 2 && emptyIndex >= 0) return emptyIndex;
		}
		return -1;
	}

	getWinLines() {
		return [
			[0, 1, 2], [3, 4, 5], [6, 7, 8],
			[0, 3, 6], [1, 4, 7], [2, 5, 8],
			[0, 4, 8], [2, 4, 6],
		];
	}

	//==============================================================================
	// 승리/무승부 판정. 종료되면 true.
	//==============================================================================
	evaluate(lastMark, winMessage) {
		const lines = this.getWinLines();
		for (const line of lines) {
			if (line.every(i => this.#cells[i].mark === lastMark)) {
				this.endGame(lastMark === PLAYER_MARK, winMessage);
				return true;
			}
		}
		if (this.#moveCount >= SIZE * SIZE) {
			this.endGame(false, "무승부");
			return true;
		}
		return false;
	}

	endGame(isWon, mainMessage) {
		this.#isGameOver = true;
		this.#statusLabel.setText(mainMessage);
		const score = isWon ? System.Math.max(0, 100 - (this.#moveCount - 3) * 10) : 0;
		const app = this.getApp();
		app.showResult({
			isWon,
			title: mainMessage,
			score,
			stats: [
				`수: ${this.#moveCount}`,
				isWon ? "적은 수로 이길수록 점수 ↑" : "",
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
