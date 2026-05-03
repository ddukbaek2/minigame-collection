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
const GAME_DURATION = 30;
const DIRS = ["up", "down", "left", "right"];
const ICONS = { "up": "▲", "down": "▼", "left": "◀", "right": "▶" };


//==============================================================================
// 방향 버튼.
//==============================================================================
class DirBtn extends WorldNode {
	/** @type { string } */ dir;
	/** @private @type { DirectionPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(part, dir) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.dir = dir;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#label = this.addComponent(Label);
		this.#label.setText(ICONS[dir]);
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

	setFontSize(s) { this.#label.setFontSize(s); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onChoice(this.dir);
	}
}


//==============================================================================
// 방향맞추기 파트.
//==============================================================================
export class DirectionPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #arrowLabelNode;
	/** @private @type { Label } */ #arrowLabel;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { DirBtn[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { string } */ #targetDir;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #correctCount;
	/** @private @type { number } */ #wrongCount;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#buttons = [];
		this.#targetDir = "up";
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.direction; }
	getNavigationTitle() { return "방향맞추기"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = this.makeLabel(40);
		this.addChild(this.#infoLabelNode);
		this.#infoLabel = this.#infoLabelNode.getComponent(Label);

		this.#arrowLabelNode = this.makeLabel(280);
		this.addChild(this.#arrowLabelNode);
		this.#arrowLabel = this.#arrowLabelNode.getComponent(Label);
		markUseSystemFont(this.#arrowLabel);

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		for (const d of DIRS) {
			const b = new DirBtn(this, d);
			this.#buttonsNode.addChild(b);
			this.#buttons.push(b);
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

	makeLabel(s) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const label = node.addComponent(Label);
		label.setFontSize(s);
		label.setTextAlign("center");
		label.setTextBaseline("middle");
		label.setText("");
		return node;
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoLabel) this.#infoLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#arrowLabel) this.#arrowLabel.setTextColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#buttons) b.refreshAppearance();
	}

	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.nextArrow();
		this.refreshInfo();
	}

	nextArrow() {
		this.#targetDir = DIRS[System.Math.floor(System.Math.random() * DIRS.length)];
		this.#arrowLabel.setText(ICONS[this.#targetDir]);
	}

	refreshInfo() {
		const t = System.Math.ceil(this.#remainingTime);
		this.#infoLabel.setText(`시간: ${t}초    정답 ${this.#correctCount}    오답 ${this.#wrongCount}`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isStarted || this.#isGameOver) return;
		this.#remainingTime -= timeDelta;
		if (this.#remainingTime <= 0) {
			this.#remainingTime = 0;
			this.refreshInfo();
			this.endGame();
			return;
		}
		this.refreshInfo();
	}

	onChoice(dir) {
		if (this.#isGameOver) return;
		if (dir === this.#targetDir) this.#correctCount += 1;
		else { this.#wrongCount += 1; this.#remainingTime = System.Math.max(0, this.#remainingTime - 2); }
		this.nextArrow();
		this.refreshInfo();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;

		const btnSize = 180;
		const btnGap = 16;
		const dirsW = btnSize * 3 + btnGap * 2;
		const dirsH = btnSize * 3 + btnGap * 2;

		const infoH = 60;
		const arrowH = 320;
		const resetH = 120;
		const vGap = 32;
		const totalH = infoH + vGap + arrowH + vGap + dirsH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#arrowLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + arrowH * 0.5));
		cy += arrowH + vGap;
		const dirsX = (contentSize.x - dirsW) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(dirsX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(dirsW, dirsH));
		const cellW = btnSize + btnGap;
		const positions = {
			"up":    [cellW, 0],
			"left":  [0, cellW],
			"right": [cellW * 2, cellW],
			"down":  [cellW, cellW * 2],
		};
		for (const b of this.#buttons) {
			const [x, y] = positions[b.dir];
			b.setLocalPosition(Vector2.create(x, y));
			b.setContentSize(Vector2.create(btnSize, btnSize));
			b.setFontSize(72);
		}
		cy += dirsH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const score = System.Math.max(0, this.#correctCount * 30 - this.#wrongCount * 15);
		const total = this.#correctCount + this.#wrongCount;
		const acc = total > 0 ? System.Math.round((this.#correctCount / total) * 100) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: this.#correctCount >= 20,
			title: "타임 오버!",
			score,
			stats: [
				`정답: ${this.#correctCount}`,
				`오답: ${this.#wrongCount}`,
				`정확도: ${acc}%`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
