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


//==============================================================================
// 게임 상수.
//==============================================================================
const SIZE = 5;
const TILE_GAP = 6;


//==============================================================================
// 셀 노드.
//==============================================================================
class SeqCell extends WorldNode {
	/** @type { number } */ value;
	/** @type { boolean } */ isCleared;
	/** @private @type { SequencePart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	constructor(part, value) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.value = value;
		this.isCleared = false;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(8);
		this.#text = this.addComponent(Text);
		this.#text.setText(String(value));
		this.#text.setFontSize(64);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.refreshAppearance();
	}

	setValue(v) {
		this.value = v;
		this.isCleared = false;
		this.#text.setText(String(v));
		this.refreshAppearance();
	}

	clear() {
		this.isCleared = true;
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		if (this.isCleared) {
			this.#paint.setColor(Color.createFromHEX(theme.surface));
			this.#text.setText("");
		}
		else {
			this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
			this.#text.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
			this.#text.setText(String(this.value));
		}
	}

	flashError() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.error));
		System.setTimeout(() => this.refreshAppearance(), 200);
	}

	setFontSize(size) { this.#text.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onCellTapped(this);
	}
}


//==============================================================================
// 순서맞추기 파트.
//==============================================================================
export class SequencePart extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { SeqCell[] } */ #cells;
	/** @private @type { WorldNode } */ #statusTextNode;
	/** @private @type { Text } */ #statusText;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #nextNumber;
	/** @private @type { number } */ #elapsed;
	/** @private @type { number } */ #wrongCount;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#cells = [];
		this.#nextNumber = 1;
		this.#elapsed = 0;
		this.#wrongCount = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.sequence; }
	getNavigationTitle() { return "순서맞추기"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

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

		for (let i = 0; i < SIZE * SIZE; ++i) {
			const cell = new SeqCell(this, i + 1);
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
		this.#resetButtonText = this.#resetButtonNode.getComponent(Text);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#statusText) this.#statusText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonText) this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const c of this.#cells) c.refreshAppearance();
	}

	resetGame() {
		this.#nextNumber = 1;
		this.#elapsed = 0;
		this.#wrongCount = 0;
		this.#isStarted = true;
		this.#isGameOver = false;

		const total = SIZE * SIZE;
		const nums = [];
		for (let i = 1; i <= total; ++i) nums.push(i);
		for (let i = nums.length - 1; i > 0; --i) {
			const j = System.Math.floor(System.Math.random() * (i + 1));
			const tmp = nums[i]; nums[i] = nums[j]; nums[j] = tmp;
		}
		for (let i = 0; i < this.#cells.length; ++i) {
			this.#cells[i].setValue(nums[i]);
		}
		this.refreshStatus();
	}

	refreshStatus() {
		const sec = this.#elapsed.toFixed(1);
		this.#statusText.setText(`다음: ${this.#nextNumber}    시간: ${sec}초    오답: ${this.#wrongCount}`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#isStarted && !this.#isGameOver) {
			this.#elapsed += timeDelta;
			this.refreshStatus();
		}
	}

	onCellTapped(cell) {
		if (this.#isGameOver) return;
		if (cell.isCleared) return;
		if (cell.value === this.#nextNumber) {
			cell.clear();
			this.#nextNumber += 1;
			if (this.#nextNumber > SIZE * SIZE) {
				this.endGame();
			}
		}
		else {
			this.#wrongCount += 1;
			cell.flashError();
		}
		this.refreshStatus();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const availW = contentSize.x - margin * 2;
		const tileSize = System.Math.floor((availW - TILE_GAP * (SIZE - 1)) / SIZE);
		const boardSize = tileSize * SIZE + TILE_GAP * (SIZE - 1);

		const headerH = 80;
		const buttonH = 120;
		const vGap = 32;
		const totalH = headerH + vGap + boardSize + vGap + buttonH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		this.#statusTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerH * 0.5));

		const boardX = (contentSize.x - boardSize) * 0.5;
		const boardY = top + headerH + vGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardSize, boardSize));
		const fontSize = System.Math.floor(tileSize * 0.5);
		for (let i = 0; i < this.#cells.length; ++i) {
			const r = System.Math.floor(i / SIZE);
			const c = i % SIZE;
			this.#cells[i].setLocalPosition(Vector2.create(c * (tileSize + TILE_GAP), r * (tileSize + TILE_GAP)));
			this.#cells[i].setContentSize(Vector2.create(tileSize, tileSize));
			this.#cells[i].setFontSize(fontSize);
		}

		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, boardY + boardSize + vGap + buttonH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const sec = this.#elapsed;
		const score = System.Math.max(0, System.Math.round(2000 - sec * 30 - this.#wrongCount * 50));
		const app = this.getApp();
		app.showResult({
			isWon: true,
			title: "완료!",
			score,
			stats: [
				`시간: ${sec.toFixed(2)}초`,
				`오답: ${this.#wrongCount}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
