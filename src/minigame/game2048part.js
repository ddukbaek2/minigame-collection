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
const SIZE = 4;
const TILE_GAP = 8;
const TILE_COLORS = {
	0: "#cdc1b4", 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563",
	32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850",
	1024: "#edc53f", 2048: "#edc22e",
};
const DARK_TEXT = "#776e65";
const LIGHT_TEXT = "#f9f6f2";


//==============================================================================
// 셀 노드.
//==============================================================================
class Tile2048 extends WorldNode {
	/** @type { number } */ value;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor() {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.value = 0;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(10);
		this.#label = this.addComponent(Label);
		this.#label.setText("");
		this.#label.setFontSize(72);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.refreshAppearance();
	}

	setValue(v) {
		this.value = v;
		this.refreshAppearance();
	}

	refreshAppearance() {
		const colorHex = TILE_COLORS[this.value] || "#3c3a32";
		this.#paint.setColor(Color.createFromHEX(colorHex));
		if (this.value === 0) {
			this.#label.setText("");
		}
		else {
			this.#label.setText(String(this.value));
			this.#label.setTextColor(Color.createFromHEX(this.value <= 4 ? DARK_TEXT : LIGHT_TEXT));
		}
	}

	setFontSize(size) { this.#label.setFontSize(size); }
}


//==============================================================================
// 방향 버튼.
//==============================================================================
class DirButton extends WorldNode {
	/** @type { string } */ dir;
	/** @private @type { Game2048Part } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(part, dir, icon) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.dir = dir;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#label = this.addComponent(Label);
		this.#label.setText(icon);
		this.#label.setFontSize(72);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		markUseSystemFont(this.#label);
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.primary));
		this.#label.setTextColor(Color.createFromHEX(theme.onPrimary));
	}

	setFontSize(size) { this.#label.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.move(this.dir);
	}
}


//==============================================================================
// 2048 파트.
//==============================================================================
export class Game2048Part extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { Tile2048[] } */ #tiles;
	/** @private @type { WorldNode } */ #scoreLabelNode;
	/** @private @type { Label } */ #scoreLabel;
	/** @private @type { WorldNode } */ #dirsNode;
	/** @private @type { DirButton[] } */ #dirButtons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #score;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { boolean } */ #hasReached2048;

	constructor() {
		super();
		this.#tiles = [];
		this.#dirButtons = [];
		this.#score = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#hasReached2048 = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.game2048; }
	getNavigationTitle() { return "2048"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#scoreLabelNode = new WorldNode();
		this.#scoreLabelNode.setPivot(Pivot.middleCenter);
		this.#scoreLabelNode.setAnchor(Pivot.topLeft);
		this.#scoreLabel = this.#scoreLabelNode.addComponent(Label);
		this.#scoreLabel.setFontSize(48);
		this.#scoreLabel.setTextAlign("center");
		this.#scoreLabel.setTextBaseline("middle");
		this.#scoreLabel.setText("");
		this.addChild(this.#scoreLabelNode);

		this.#boardNode = new WorldNode();
		this.#boardNode.setPivot(Pivot.topLeft);
		this.#boardNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#boardNode);
		for (let i = 0; i < SIZE * SIZE; ++i) {
			const tile = new Tile2048();
			this.#boardNode.addChild(tile);
			this.#tiles.push(tile);
		}

		this.#dirsNode = new WorldNode();
		this.#dirsNode.setPivot(Pivot.topLeft);
		this.#dirsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#dirsNode);
		const dirSpecs = [
			["up", "▲"], ["left", "◀"], ["right", "▶"], ["down", "▼"],
		];
		for (const [d, icon] of dirSpecs) {
			const b = new DirButton(this, d, icon);
			this.#dirsNode.addChild(b);
			this.#dirButtons.push(b);
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
		if (this.#scoreLabel) this.#scoreLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#dirButtons) b.refreshAppearance();
	}

	resetGame() {
		this.#score = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		this.#hasReached2048 = false;
		for (const t of this.#tiles) t.setValue(0);
		this.spawnRandom();
		this.spawnRandom();
		this.refreshScore();
	}

	refreshScore() {
		this.#scoreLabel.setText(`점수: ${this.#score}`);
	}

	spawnRandom() {
		const empties = [];
		for (let i = 0; i < this.#tiles.length; ++i) {
			if (this.#tiles[i].value === 0) empties.push(i);
		}
		if (empties.length === 0) return;
		const pick = empties[System.Math.floor(System.Math.random() * empties.length)];
		this.#tiles[pick].setValue(System.Math.random() < 0.9 ? 2 : 4);
	}

	get(r, c) { return this.#tiles[r * SIZE + c].value; }
	set(r, c, v) { this.#tiles[r * SIZE + c].setValue(v); }

	move(dir) {
		if (this.#isGameOver) return;
		// 한 줄을 왼쪽으로 미는 헬퍼.
		const slide = (line) => {
			const filtered = line.filter(v => v !== 0);
			let gained = 0;
			for (let i = 0; i < filtered.length - 1; ++i) {
				if (filtered[i] === filtered[i + 1]) {
					filtered[i] *= 2;
					gained += filtered[i];
					filtered.splice(i + 1, 1);
				}
			}
			while (filtered.length < SIZE) filtered.push(0);
			return { line: filtered, gained };
		};

		let moved = false;
		let totalGained = 0;
		for (let i = 0; i < SIZE; ++i) {
			let line = [];
			for (let j = 0; j < SIZE; ++j) {
				if (dir === "left") line.push(this.get(i, j));
				else if (dir === "right") line.push(this.get(i, SIZE - 1 - j));
				else if (dir === "up") line.push(this.get(j, i));
				else line.push(this.get(SIZE - 1 - j, i));
			}
			const before = line.slice();
			const { line: newLine, gained } = slide(line);
			totalGained += gained;
			for (let j = 0; j < SIZE; ++j) {
				if (newLine[j] !== before[j]) moved = true;
				if (dir === "left") this.set(i, j, newLine[j]);
				else if (dir === "right") this.set(i, SIZE - 1 - j, newLine[j]);
				else if (dir === "up") this.set(j, i, newLine[j]);
				else this.set(SIZE - 1 - j, i, newLine[j]);
			}
		}
		if (moved) {
			this.#isStarted = true;
			this.#score += totalGained;
			this.spawnRandom();
			this.refreshScore();
			if (!this.#hasReached2048) {
				for (const t of this.#tiles) {
					if (t.value >= 2048) { this.#hasReached2048 = true; break; }
				}
				if (this.#hasReached2048) {
					this.endGame(true, "2048 달성!");
					return;
				}
			}
			if (!this.canMove()) {
				this.endGame(false, "게임 오버");
			}
		}
	}

	canMove() {
		for (const t of this.#tiles) if (t.value === 0) return true;
		for (let r = 0; r < SIZE; ++r) {
			for (let c = 0; c < SIZE; ++c) {
				const v = this.get(r, c);
				if (c + 1 < SIZE && this.get(r, c + 1) === v) return true;
				if (r + 1 < SIZE && this.get(r + 1, c) === v) return true;
			}
		}
		return false;
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const availW = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availW - TILE_GAP * (SIZE - 1)) / SIZE);
		const boardSize = tileSize * SIZE + TILE_GAP * (SIZE - 1);

		const headerH = 80;
		const dirsH = 360;        // 방향 버튼들 총 높이.
		const resetH = 120;
		const vGap = 24;
		const totalH = headerH + vGap + boardSize + vGap + dirsH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		this.#scoreLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerH * 0.5));

		const boardX = (contentSize.x - boardSize) * 0.5;
		const boardY = top + headerH + vGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardSize, boardSize));
		const fontSize = System.Math.floor(tileSize * 0.45);
		for (let i = 0; i < this.#tiles.length; ++i) {
			const r = System.Math.floor(i / SIZE);
			const c = i % SIZE;
			this.#tiles[i].setLocalPosition(Vector2.create(c * (tileSize + TILE_GAP), r * (tileSize + TILE_GAP)));
			this.#tiles[i].setContentSize(Vector2.create(tileSize, tileSize));
			this.#tiles[i].setFontSize(fontSize);
		}

		// 방향버튼 십자 배치.
		const btnSize = 160;
		const btnGap = 12;
		const dirsW = btnSize * 3 + btnGap * 2;
		const dirsX = (contentSize.x - dirsW) * 0.5;
		const dirsY = boardY + boardSize + vGap;
		this.#dirsNode.setLocalPosition(Vector2.create(dirsX, dirsY));
		this.#dirsNode.setContentSize(Vector2.create(dirsW, dirsH));
		// up: center top, left/right: middle, down: center bottom.
		const cellW = btnSize + btnGap;
		const positions = {
			"up":    [cellW, 0],
			"left":  [0, cellW],
			"right": [cellW * 2, cellW],
			"down":  [cellW, cellW * 2],
		};
		for (const b of this.#dirButtons) {
			const [x, y] = positions[b.dir];
			b.setLocalPosition(Vector2.create(x, y));
			b.setContentSize(Vector2.create(btnSize, btnSize));
			b.setFontSize(56);
		}

		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, dirsY + dirsH + vGap + resetH * 0.5));
	}

	endGame(isWon, title) {
		this.#isGameOver = true;
		const app = this.getApp();
		let max = 0;
		for (const t of this.#tiles) if (t.value > max) max = t.value;
		app.showResult({
			isWon,
			title,
			score: this.#score,
			stats: [
				`최대 타일: ${max}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
