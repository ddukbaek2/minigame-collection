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
const STATE_IDLE = "idle";        // 시작 전.
const STATE_WAITING = "waiting";  // 빨간색 대기 중.
const STATE_GO = "go";            // 초록색, 탭하라.
const STATE_RESULT = "result";    // 결과 표시.
const STATE_FOUL = "foul";        // 너무 빨리 탭.
const ROUNDS = 5;
const MIN_WAIT = 1.0;
const MAX_WAIT = 4.0;


//==============================================================================
// 반응속도 파트.
//==============================================================================
export class ReactionTimePart extends Part {
	/** @private @type { WorldNode } */ #panelNode;
	/** @private @type { Paint } */ #panelPaint;
	/** @private @type { Label } */ #panelLabel;
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { string } */ #state;
	/** @private @type { number } */ #waitTimer;
	/** @private @type { number } */ #goElapsed;
	/** @private @type { number } */ #round;
	/** @private @type { number[] } */ #times;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#state = STATE_IDLE;
		this.#waitTimer = 0;
		this.#goElapsed = 0;
		this.#round = 0;
		this.#times = [];
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.reactionTime; }
	getNavigationTitle() { return "반응속도"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() {
		return this.#round > 0 && !this.#isGameOver;
	}
	getExitConfirmMessage() {
		return "현재 게임을 그만두시겠습니까?";
	}

	onBuild() {
		this.setupBackground();

		this.#panelNode = new WorldNode();
		this.#panelNode.setPivot(Pivot.middleCenter);
		this.#panelNode.setAnchor(Pivot.topLeft);
		this.#panelNode.setInteractable(true);
		this.#panelPaint = this.#panelNode.addComponent(Paint);
		this.#panelPaint.setRoundSize(20);
		this.#panelLabel = this.#panelNode.addComponent(Label);
		this.#panelLabel.setFontSize(56);
		this.#panelLabel.setTextAlign("center");
		this.#panelLabel.setTextBaseline("middle");
		this.#panelLabel.setText("");
		this.#panelNode.touchRelease = (pos) => {
			if (this.#panelNode.contains(pos)) this.onPanelTapped();
		};
		this.addChild(this.#panelNode);

		this.#infoLabelNode = new WorldNode();
		this.#infoLabelNode.setPivot(Pivot.middleCenter);
		this.#infoLabelNode.setAnchor(Pivot.topLeft);
		this.#infoLabel = this.#infoLabelNode.addComponent(Label);
		this.#infoLabel.setFontSize(40);
		this.#infoLabel.setTextAlign("center");
		this.#infoLabel.setTextBaseline("middle");
		this.#infoLabel.setText("");
		this.addChild(this.#infoLabelNode);

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

	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoLabel) this.#infoLabel.setTextColor(Color.createFromHEX(theme.onBackground));
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
		else if (this.#state === STATE_WAITING) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.error));
			this.#panelLabel.setText("기다리세요...");
			this.#panelLabel.setTextColor(Color.createFromHEX(theme.onError));
		}
		else if (this.#state === STATE_GO) {
			this.#panelPaint.setColor(Color.createFromHEX("#22c55e"));
			this.#panelLabel.setText("탭!");
			this.#panelLabel.setTextColor(Color.createFromHEX("#ffffff"));
		}
		else if (this.#state === STATE_RESULT) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.surface));
			this.#panelLabel.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		else if (this.#state === STATE_FOUL) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.error));
			this.#panelLabel.setText("너무 빨라요!\n탭해서 다시");
			this.#panelLabel.setTextColor(Color.createFromHEX(theme.onError));
		}
	}

	resetGame() {
		this.#state = STATE_IDLE;
		this.#round = 0;
		this.#times = [];
		this.#waitTimer = 0;
		this.#goElapsed = 0;
		this.#isGameOver = false;
		this.refreshPanel();
		this.refreshInfo();
	}

	refreshInfo() {
		this.#infoLabel.setText(`라운드 ${this.#round + (this.#state === STATE_RESULT ? 0 : 0)} / ${ROUNDS}    기록: ${this.#times.length}`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#state === STATE_WAITING) {
			this.#waitTimer -= timeDelta;
			if (this.#waitTimer <= 0) {
				this.#state = STATE_GO;
				this.#goElapsed = 0;
				this.refreshPanel();
			}
		}
		else if (this.#state === STATE_GO) {
			this.#goElapsed += timeDelta;
		}
	}

	onPanelTapped() {
		if (this.#isGameOver) return;
		if (this.#state === STATE_IDLE || this.#state === STATE_RESULT || this.#state === STATE_FOUL) {
			this.startNextRound();
		}
		else if (this.#state === STATE_WAITING) {
			this.#state = STATE_FOUL;
			this.refreshPanel();
		}
		else if (this.#state === STATE_GO) {
			const ms = System.Math.round(this.#goElapsed * 1000);
			this.#times.push(ms);
			this.#round += 1;
			this.#state = STATE_RESULT;
			this.#panelLabel.setText(`${ms}ms\n탭해서 계속`);
			this.refreshPanel();
			this.refreshInfo();
			if (this.#round >= ROUNDS) {
				this.endGame();
			}
		}
	}

	startNextRound() {
		this.#state = STATE_WAITING;
		this.#waitTimer = MIN_WAIT + System.Math.random() * (MAX_WAIT - MIN_WAIT);
		this.refreshPanel();
		this.refreshInfo();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 60;
		const panelHeight = 700;
		const infoHeight = 60;
		const buttonHeight = 120;
		const gap = 32;
		const totalH = panelHeight + gap + infoHeight + gap + buttonHeight;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		this.#panelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + panelHeight * 0.5));
		this.#panelNode.setContentSize(Vector2.create(contentSize.x - margin * 2, panelHeight));

		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + panelHeight + gap + infoHeight * 0.5));
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + panelHeight + gap + infoHeight + gap + buttonHeight * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const sum = this.#times.reduce((a, b) => a + b, 0);
		const avg = System.Math.round(sum / this.#times.length);
		const best = System.Math.min(...this.#times);
		// 점수: 평균 ms 가 작을수록 큼. 1000 - avg/2.
		const score = System.Math.max(0, System.Math.round(1000 - avg * 0.8));
		const app = this.getApp();
		app.showResult({
			isWon: true,
			title: "완료!",
			score,
			stats: [
				`평균: ${avg}ms`,
				`최고: ${best}ms`,
				`기록: ${this.#times.join(", ")}ms`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
