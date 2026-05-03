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
const TARGETS = [3, 5, 7, 10, 15];
const STATE_IDLE = "idle";
const STATE_RUNNING = "running";
const STATE_DONE = "done";


//==============================================================================
// 카운트 스톱 파트.
//==============================================================================
export class CountStopPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #targetLabelNode;
	/** @private @type { Label } */ #targetLabel;
	/** @private @type { WorldNode } */ #panelNode;
	/** @private @type { Paint } */ #panelPaint;
	/** @private @type { Label } */ #panelLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { string } */ #state;
	/** @private @type { number } */ #targetIndex;
	/** @private @type { number } */ #elapsed;
	/** @private @type { number[] } */ #errors;     // ms 단위 오차.
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#state = STATE_IDLE;
		this.#targetIndex = 0;
		this.#elapsed = 0;
		this.#errors = [];
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.countStop; }
	getNavigationTitle() { return "카운트 스톱"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = this.makeLabel(40);
		this.addChild(this.#infoLabelNode);
		this.#infoLabel = this.#infoLabelNode.getComponent(Label);

		this.#targetLabelNode = this.makeLabel(64);
		this.addChild(this.#targetLabelNode);
		this.#targetLabel = this.#targetLabelNode.getComponent(Label);

		this.#panelNode = new WorldNode();
		this.#panelNode.setPivot(Pivot.middleCenter);
		this.#panelNode.setAnchor(Pivot.topLeft);
		this.#panelNode.setInteractable(true);
		this.#panelPaint = this.#panelNode.addComponent(Paint);
		this.#panelPaint.setRoundSize(20);
		this.#panelLabel = this.#panelNode.addComponent(Label);
		this.#panelLabel.setFontSize(96);
		this.#panelLabel.setTextAlign("center");
		this.#panelLabel.setTextBaseline("middle");
		this.#panelLabel.setText("");
		this.#panelNode.touchRelease = (pos) => {
			if (this.#panelNode.contains(pos)) this.onPanelTapped();
		};
		this.addChild(this.#panelNode);

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
		if (this.#targetLabel) this.#targetLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		this.refreshPanel();
	}

	refreshPanel() {
		const theme = getCurrentGameTheme();
		if (this.#state === STATE_IDLE) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.primary));
			this.#panelLabel.setText("탭해서 시작");
			this.#panelLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		else if (this.#state === STATE_RUNNING) {
			// 시간 숨김. 빈 패널.
			this.#panelPaint.setColor(Color.createFromHEX(theme.surfaceVariant));
			this.#panelLabel.setText("?");
			this.#panelLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
		else if (this.#state === STATE_DONE) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.surface));
			this.#panelLabel.setTextColor(Color.createFromHEX(theme.onSurface));
		}
	}

	resetGame() {
		this.#state = STATE_IDLE;
		this.#targetIndex = 0;
		this.#elapsed = 0;
		this.#errors = [];
		this.#isStarted = false;
		this.#isGameOver = false;
		this.refreshPanel();
		this.refreshInfo();
		this.refreshTarget();
	}

	refreshInfo() {
		this.#infoLabel.setText(`라운드 ${this.#targetIndex + (this.#state === STATE_DONE ? 0 : 0)} / ${TARGETS.length}`);
	}

	refreshTarget() {
		if (this.#targetIndex < TARGETS.length) {
			this.#targetLabel.setText(`정확히 ${TARGETS[this.#targetIndex]}초에 멈춰보세요`);
		}
		else {
			this.#targetLabel.setText("");
		}
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#state === STATE_RUNNING) {
			this.#elapsed += timeDelta;
		}
	}

	onPanelTapped() {
		if (this.#isGameOver) return;
		if (this.#state === STATE_IDLE || this.#state === STATE_DONE) {
			if (this.#targetIndex >= TARGETS.length) return;
			this.#state = STATE_RUNNING;
			this.#elapsed = 0;
			this.#isStarted = true;
			this.refreshPanel();
		}
		else if (this.#state === STATE_RUNNING) {
			const target = TARGETS[this.#targetIndex];
			const error = System.Math.abs(this.#elapsed - target);
			this.#errors.push(error);
			this.#targetIndex += 1;
			this.#state = STATE_DONE;
			this.#panelLabel.setText(`${this.#elapsed.toFixed(2)}초\n오차 ${(error * 1000).toFixed(0)}ms\n탭해서 계속`);
			this.refreshPanel();
			this.refreshInfo();
			this.refreshTarget();
			if (this.#targetIndex >= TARGETS.length) {
				this.endGame();
			}
		}
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 60;

		const infoH = 60;
		const targetH = 80;
		const panelH = 540;
		const resetH = 120;
		const vGap = 32;
		const totalH = infoH + vGap + targetH + vGap + panelH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#targetLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + targetH * 0.5));
		cy += targetH + vGap;
		this.#panelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + panelH * 0.5));
		this.#panelNode.setContentSize(Vector2.create(contentSize.x - margin * 2, panelH));
		cy += panelH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const totalErrorMs = this.#errors.reduce((a, b) => a + b * 1000, 0);
		const avgErrorMs = totalErrorMs / this.#errors.length;
		const score = System.Math.max(0, System.Math.round(2000 - avgErrorMs));
		const app = this.getApp();
		app.showResult({
			isWon: avgErrorMs < 500,
			title: "완료!",
			score,
			stats: [
				`평균 오차: ${avgErrorMs.toFixed(0)}ms`,
				`최소 오차: ${(System.Math.min(...this.#errors) * 1000).toFixed(0)}ms`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
