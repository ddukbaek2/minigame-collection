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
	/** @private @type { Text } */ #panelText;
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { string } */ #state;
	/** @private @type { number } */ #waitTimer;
	/** @private @type { number } */ #goElapsed;
	/** @private @type { number } */ #round;
	/** @private @type { number[] } */ #times;
	/** @private @type { boolean } */ #isGameOver;

	//==============================================================================
	// constructor.
	//==============================================================================
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

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() { return PartId.reactionTime; }
	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() { return "반응속도"; }
	//==============================================================================
	// getNavigationBackIcon.
	//==============================================================================
	getNavigationBackIcon() { return "❌"; }

	//==============================================================================
	// shouldConfirmExit.
	//==============================================================================
	shouldConfirmExit() {
		return this.#round > 0 && !this.#isGameOver;
	}
	//==============================================================================
	// getExitConfirmMessage.
	//==============================================================================
	getExitConfirmMessage() {
		return "현재 게임을 그만두시겠습니까?";
	}

	//==============================================================================
	// onBuild.
	//==============================================================================
	onBuild() {
		this.setupBackground();

		this.#panelNode = new WorldNode();
		this.#panelNode.setPivot(Pivot.middleCenter);
		this.#panelNode.setAnchor(Pivot.topLeft);
		this.#panelNode.setInteractable(true);
		this.#panelPaint = this.#panelNode.addComponent(Paint);
		this.#panelPaint.setRoundSize(20);
		this.#panelText = this.#panelNode.addComponent(Text);
		this.#panelText.setFontSize(56);
		this.#panelText.setTextAlign("center");
		this.#panelText.setTextBaseline("middle");
		this.#panelText.setText("");
		this.#panelNode.touchRelease = (pos) => {
			if (this.#panelNode.contains(pos)) this.onPanelTapped();
		};
		this.addChild(this.#panelNode);

		this.#infoTextNode = new WorldNode();
		this.#infoTextNode.setPivot(Pivot.middleCenter);
		this.#infoTextNode.setAnchor(Pivot.topLeft);
		this.#infoText = this.#infoTextNode.addComponent(Text);
		this.#infoText.setFontSize(40);
		this.#infoText.setTextAlign("center");
		this.#infoText.setTextBaseline("middle");
		this.#infoText.setText("");
		this.addChild(this.#infoTextNode);

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

	//==============================================================================
	// enter.
	//==============================================================================
	enter() {
		this.resetGame();
		this.layout();
	}

	//==============================================================================
	// onResize.
	//==============================================================================
	onResize() {
		this.layout();
	}

	//==============================================================================
	// applyTheme.
	//==============================================================================
	/**
	 * @param { * } theme
	 */
	applyTheme(theme) {}

	//==============================================================================
	// applyGameTheme.
	//==============================================================================
	/**
	 * @param { * } theme
	 */
	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) {
			bg.setColor(Color.createFromHEX(theme.background));
		}
		if (this.#infoText) {
			this.#infoText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		if (this.#resetButtonPaint) {
			this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		}
		if (this.#resetButtonText) {
			this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}		this.refreshPanel();
	}

	//==============================================================================
	// refreshPanel.
	//==============================================================================
	refreshPanel() {
		const theme = getCurrentGameTheme();
		if (this.#state === STATE_IDLE) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.primary));
			this.#panelText.setText("탭해서 시작");
			this.#panelText.setTextColor(Color.createFromHEX(theme.onPrimary));
		}
		else if (this.#state === STATE_WAITING) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.error));
			this.#panelText.setText("기다리세요...");
			this.#panelText.setTextColor(Color.createFromHEX(theme.onError));
		}
		else if (this.#state === STATE_GO) {
			this.#panelPaint.setColor(Color.createFromHEX("#22c55e"));
			this.#panelText.setText("탭!");
			this.#panelText.setTextColor(Color.createFromHEX("#ffffff"));
		}
		else if (this.#state === STATE_RESULT) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.surface));
			this.#panelText.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		else if (this.#state === STATE_FOUL) {
			this.#panelPaint.setColor(Color.createFromHEX(theme.error));
			this.#panelText.setText("너무 빨라요!\n탭해서 다시");
			this.#panelText.setTextColor(Color.createFromHEX(theme.onError));
		}
	}

	//==============================================================================
	// resetGame.
	//==============================================================================
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

	//==============================================================================
	// refreshInfo.
	//==============================================================================
	refreshInfo() {
		this.#infoText.setText(`라운드 ${this.#round + (this.#state === STATE_RESULT ? 0 : 0)} / ${ROUNDS}    기록: ${this.#times.length}`);
	}

	//==============================================================================
	// tick.
	//==============================================================================
	/**
	 * @param { * } timeDelta
	 */
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

	//==============================================================================
	// onPanelTapped.
	//==============================================================================
	onPanelTapped() {
		if (this.#isGameOver) {
			return;
		}
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
			this.#panelText.setText(`${ms}ms\n탭해서 계속`);
			this.refreshPanel();
			this.refreshInfo();
			if (this.#round >= ROUNDS) {
				this.endGame();
			}
		}
	}

	//==============================================================================
	// startNextRound.
	//==============================================================================
	startNextRound() {
		this.#state = STATE_WAITING;
		this.#waitTimer = MIN_WAIT + System.Math.random() * (MAX_WAIT - MIN_WAIT);
		this.refreshPanel();
		this.refreshInfo();
	}

	//==============================================================================
	// layout.
	//==============================================================================
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

		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + panelHeight + gap + infoHeight * 0.5));
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + panelHeight + gap + infoHeight + gap + buttonHeight * 0.5));
	}

	//==============================================================================
	// endGame.
	//==============================================================================
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
