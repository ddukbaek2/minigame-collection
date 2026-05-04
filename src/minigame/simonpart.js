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
const PAD_COLORS_BASE = ["#22c55e", "#ef4444", "#3b82f6", "#eab308"];
const PAD_COLORS_BRIGHT = ["#86efac", "#fca5a5", "#93c5fd", "#fde68a"];
const FLASH_DURATION = 0.45;
const FLASH_GAP = 0.15;


//==============================================================================
// 패드 노드.
//==============================================================================
class SimonPad extends WorldNode {
	/** @type { number } */ index;
	/** @private @type { SimonPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { boolean } */ #isFlashing;

	constructor(part, index) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.index = index;
		this.#part = part;
		this.#isFlashing = false;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.refreshAppearance();
	}

	setFlashing(on) {
		this.#isFlashing = on;
		this.refreshAppearance();
	}

	refreshAppearance() {
		const hex = this.#isFlashing ? PAD_COLORS_BRIGHT[this.index] : PAD_COLORS_BASE[this.index];
		this.#paint.setColor(Color.createFromHEX(hex));
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onPadTapped(this.index);
	}
}


//==============================================================================
// 사이먼 파트.
//==============================================================================
export class SimonPart extends Part {
	/** @private @type { WorldNode } */ #boardNode;
	/** @private @type { SimonPad[] } */ #pads;
	/** @private @type { WorldNode } */ #statusLabelNode;
	/** @private @type { Label } */ #statusLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number[] } */ #sequence;
	/** @private @type { number } */ #playIndex;
	/** @private @type { number } */ #userIndex;
	/** @private @type { number } */ #playTimer;
	/** @private @type { boolean } */ #isPlaying;        // CPU 가 시퀀스 보여주는 중.
	/** @private @type { boolean } */ #isUserTurn;
	/** @private @type { boolean } */ #isGameOver;
	/** @private @type { number } */ #score;

	constructor() {
		super();
		this.#pads = [];
		this.#sequence = [];
		this.#playIndex = 0;
		this.#userIndex = 0;
		this.#playTimer = 0;
		this.#isPlaying = false;
		this.#isUserTurn = false;
		this.#isGameOver = false;
		this.#score = 0;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.simon; }
	getNavigationTitle() { return "사이먼"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() {
		return this.#sequence.length > 0 && !this.#isGameOver;
	}
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

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

		for (let i = 0; i < 4; ++i) {
			const pad = new SimonPad(this, i);
			this.#boardNode.addChild(pad);
			this.#pads.push(pad);
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
		if (this.#statusLabel) this.#statusLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
	}

	resetGame() {
		this.#sequence = [];
		this.#userIndex = 0;
		this.#playIndex = 0;
		this.#playTimer = 0;
		this.#isPlaying = false;
		this.#isUserTurn = false;
		this.#isGameOver = false;
		this.#score = 0;
		for (const pad of this.#pads) pad.setFlashing(false);
		this.startNextRound();
	}

	startNextRound() {
		this.#sequence.push(System.Math.floor(System.Math.random() * 4));
		this.#userIndex = 0;
		this.#playIndex = 0;
		this.#isUserTurn = false;
		this.#isPlaying = true;
		this.#playTimer = 0.6;
		this.refreshStatus();
	}

	refreshStatus() {
		this.#statusLabel.setText(`라운드 ${this.#sequence.length}    점수 ${this.#score}`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isPlaying) return;
		this.#playTimer -= timeDelta;
		if (this.#playTimer > 0) return;

		if (this.#playIndex >= this.#sequence.length * 2) {
			// 모든 페어 종료.
			this.#isPlaying = false;
			this.#isUserTurn = true;
			for (const pad of this.#pads) pad.setFlashing(false);
			this.refreshStatus();
			return;
		}
		const isFlashOn = (this.#playIndex % 2) === 0;
		const seqIdx = System.Math.floor(this.#playIndex / 2);
		if (isFlashOn) {
			const padIdx = this.#sequence[seqIdx];
			for (let i = 0; i < this.#pads.length; ++i) {
				this.#pads[i].setFlashing(i === padIdx);
			}
			this.#playTimer = FLASH_DURATION;
		}
		else {
			for (const pad of this.#pads) pad.setFlashing(false);
			this.#playTimer = FLASH_GAP;
		}
		this.#playIndex += 1;
	}

	onPadTapped(index) {
		if (this.#isGameOver) return;
		if (!this.#isUserTurn) return;
		// 사용자 입력 시각적 피드백.
		const pad = this.#pads[index];
		pad.setFlashing(true);
		// 짧은 지연 후 끄기 위해 setTimeout 대신 다음 tick 에서 처리. 단순히 즉시 끔.
		System.setTimeout(() => pad.setFlashing(false), 200);

		const expected = this.#sequence[this.#userIndex];
		if (index !== expected) {
			this.endGame();
			return;
		}
		this.#userIndex += 1;
		if (this.#userIndex >= this.#sequence.length) {
			this.#score = this.#sequence.length;
			this.refreshStatus();
			this.#isUserTurn = false;
			System.setTimeout(() => {
				if (!this.#isGameOver) this.startNextRound();
			}, 600);
		}
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 60;
		const gap = 16;
		const padSize = System.Math.floor((contentSize.x - margin * 2 - gap) / 2);
		const boardSize = padSize * 2 + gap;

		const headerH = 80;
		const buttonH = 120;
		const verticalGap = 40;
		const totalH = headerH + verticalGap + boardSize + verticalGap + buttonH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		this.#statusLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + headerH * 0.5));

		const boardX = (contentSize.x - boardSize) * 0.5;
		const boardY = top + headerH + verticalGap;
		this.#boardNode.setLocalPosition(Vector2.create(boardX, boardY));
		this.#boardNode.setContentSize(Vector2.create(boardSize, boardSize));

		// 0:좌상, 1:우상, 2:좌하, 3:우하.
		const positions = [[0, 0], [1, 0], [0, 1], [1, 1]];
		for (let i = 0; i < this.#pads.length; ++i) {
			const [c, r] = positions[i];
			this.#pads[i].setLocalPosition(Vector2.create(c * (padSize + gap), r * (padSize + gap)));
			this.#pads[i].setContentSize(Vector2.create(padSize, padSize));
		}

		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, boardY + boardSize + verticalGap + buttonH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const score = this.#score * 100;
		const app = this.getApp();
		app.showResult({
			isWon: this.#score >= 5,
			title: this.#score >= 5 ? "잘했어요!" : "실패",
			score,
			stats: [
				`도달 라운드: ${this.#sequence.length}`,
				`성공: ${this.#score}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
