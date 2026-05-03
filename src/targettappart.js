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
import { createButtonNode } from "./uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "./theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const GAME_DURATION = 20;
const TARGET_RADIUS = 80;
const TARGET_LIFETIME = 1.5;


//==============================================================================
// 표적 노드.
//==============================================================================
class Target extends WorldNode {
	/** @type { number } */ lifetime;
	/** @private @type { TargetTapPart } */ #part;
	/** @private @type { Paint } */ #paint;

	constructor(part) {
		super();
		this.setPivot(Pivot.middleCenter);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.lifetime = TARGET_LIFETIME;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(TARGET_RADIUS);
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.primary));
	}

	tickTarget(timeDelta) {
		this.lifetime -= timeDelta;
	}

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onTargetHit(this);
	}
}


//==============================================================================
// 표적탭 파트.
//==============================================================================
export class TargetTapPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #fieldNode;
	/** @private @type { Paint } */ #fieldPaint;
	/** @private @type { Target | null } */ #current;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #hits;
	/** @private @type { number } */ #misses;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#current = null;
		this.#remainingTime = GAME_DURATION;
		this.#hits = 0;
		this.#misses = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.targetTap; }
	getNavigationTitle() { return "표적탭"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = new WorldNode();
		this.#infoLabelNode.setPivot(Pivot.middleCenter);
		this.#infoLabelNode.setAnchor(Pivot.topLeft);
		this.#infoLabel = this.#infoLabelNode.addComponent(Label);
		this.#infoLabel.setFontSize(40);
		this.#infoLabel.setTextAlign("center");
		this.#infoLabel.setTextBaseline("middle");
		this.#infoLabel.setText("");
		this.addChild(this.#infoLabelNode);

		this.#fieldNode = new WorldNode();
		this.#fieldNode.setPivot(Pivot.topLeft);
		this.#fieldNode.setAnchor(Pivot.topLeft);
		this.#fieldNode.setInteractable(true);
		this.#fieldPaint = this.#fieldNode.addComponent(Paint);
		this.#fieldPaint.setRoundSize(20);
		// 빈 영역 클릭 시 miss.
		this.#fieldNode.touchRelease = (pos) => {
			if (this.#fieldNode.contains(pos)) this.onFieldTapped();
		};
		this.addChild(this.#fieldNode);

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

	enter() { this.layout(); this.resetGame(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoLabel) this.#infoLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#fieldPaint) this.#fieldPaint.setColor(Color.createFromHEX(theme.surfaceVariant));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		if (this.#current) this.#current.refreshAppearance();
	}

	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#hits = 0;
		this.#misses = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		if (this.#current) {
			this.#fieldNode.removeChild(this.#current);
			this.#current = null;
		}
		this.spawnTarget();
		this.refreshInfo();
	}

	spawnTarget() {
		const fieldSize = this.#fieldNode.getContentSize();
		if (!fieldSize || fieldSize.x <= 0) return;
		const t = new Target(this);
		const pad = TARGET_RADIUS + 10;
		const x = pad + System.Math.random() * (fieldSize.x - pad * 2);
		const y = pad + System.Math.random() * (fieldSize.y - pad * 2);
		t.setLocalPosition(Vector2.create(x, y));
		t.setContentSize(Vector2.create(TARGET_RADIUS * 2, TARGET_RADIUS * 2));
		this.#fieldNode.addChild(t);
		this.#current = t;
	}

	refreshInfo() {
		const t = System.Math.ceil(this.#remainingTime);
		this.#infoLabel.setText(`시간: ${t}초    명중 ${this.#hits}    빗나감 ${this.#misses}`);
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
		if (this.#current) {
			this.#current.tickTarget(timeDelta);
			if (this.#current.lifetime <= 0) {
				// 놓침.
				this.#misses += 1;
				this.#fieldNode.removeChild(this.#current);
				this.#current = null;
				this.spawnTarget();
			}
		}
		this.refreshInfo();
	}

	onTargetHit(target) {
		if (this.#isGameOver) return;
		if (target !== this.#current) return;
		this.#hits += 1;
		this.#current.removeFromParent();
		this.#current = null;
		this.spawnTarget();
		this.refreshInfo();
	}

	onFieldTapped() {
		if (this.#isGameOver) return;
		this.#misses += 1;
		this.refreshInfo();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const infoH = 60;
		const resetH = 120;
		const vGap = 24;
		const fieldH = contentSize.y - infoH - resetH - vGap * 2 - margin * 2;
		let cy = margin;
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#fieldNode.setLocalPosition(Vector2.create(margin, cy));
		this.#fieldNode.setContentSize(Vector2.create(contentSize.x - margin * 2, fieldH));
		cy += fieldH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		if (this.#current) {
			this.#fieldNode.removeChild(this.#current);
			this.#current = null;
		}
		const score = System.Math.max(0, this.#hits * 30 - this.#misses * 10);
		const total = this.#hits + this.#misses;
		const acc = total > 0 ? System.Math.round((this.#hits / total) * 100) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: this.#hits >= 15,
			title: "타임 오버!",
			score,
			stats: [
				`명중: ${this.#hits}`,
				`빗나감: ${this.#misses}`,
				`정확도: ${acc}%`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
