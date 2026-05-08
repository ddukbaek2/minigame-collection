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
const TARGETS = [3, 5, 7, 10, 15];
const STATE_IDLE = "idle";
const STATE_RUNNING = "running";
const STATE_DONE = "done";


//==============================================================================
// 카운트 스톱 파트.
//==============================================================================
export class CountStopPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #targetTextNode;
	/** @private @type { Text } */ #targetText;
	/** @private @type { WorldNode } */ #panelNode;
	/** @private @type { Paint } */ #panelPaint;
	/** @private @type { Text } */ #panelText;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
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

		this.#infoTextNode = this.makeText(40);
		this.addChild(this.#infoTextNode);
		this.#infoText = this.#infoTextNode.getComponent(Text);

		this.#targetTextNode = this.makeText(64);
		this.addChild(this.#targetTextNode);
		this.#targetText = this.#targetTextNode.getComponent(Text);

		this.#panelNode = new WorldNode();
		this.#panelNode.setPivot(Pivot.middleCenter);
		this.#panelNode.setAnchor(Pivot.topLeft);
		this.#panelNode.setInteractable(true);
		this.#panelPaint = this.#panelNode.addComponent(Paint);
		this.#panelPaint.setRoundSize(20);
		this.#panelText = this.#panelNode.addComponent(Text);
		this.#panelText.setFontSize(96);
		this.#panelText.setTextAlign("center");
		this.#panelText.setTextBaseline("middle");
		this.#panelText.setText("");
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
		this.#resetButtonText = this.#resetButtonNode.getComponent(Text);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	makeText(s) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const text = node.addComponent(Text);
		text.setFontSize(s);
		text.setTextAlign("center");
		text.setTextBaseline("middle");
		text.setText("");
		return node;
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoText) this.#infoText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#targetText) this.#targetText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonText) this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		this.refreshPanel();
	}

	refreshPanel() {
		const theme = getCurrentGameTheme();
		if (this.#state === STATE_IDLE) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.primary));
			this.#panelText.setText("탭해서 시작");
			this.#panelText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		else if (this.#state === STATE_RUNNING) {
			// 시간 숨김. 빈 패널.
			this.#panelPaint.setColor(Color.createFromHEX(theme.surfaceVariant));
			this.#panelText.setText("?");
			this.#panelText.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
		else if (this.#state === STATE_DONE) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.surface));
			this.#panelText.setTextColor(Color.createFromHEX(theme.onSurface));
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
		this.#infoText.setText(`라운드 ${this.#targetIndex + (this.#state === STATE_DONE ? 0 : 0)} / ${TARGETS.length}`);
	}

	refreshTarget() {
		if (this.#targetIndex < TARGETS.length) {
			this.#targetText.setText(`정확히 ${TARGETS[this.#targetIndex]}초에 멈춰보세요`);
		}
		else {
			this.#targetText.setText("");
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
			this.#panelText.setText(`${this.#elapsed.toFixed(2)}초\n오차 ${(error * 1000).toFixed(0)}ms\n탭해서 계속`);
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
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#targetTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + targetH * 0.5));
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
