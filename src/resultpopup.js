//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { createButtonNode, createLabelNode } from "./uihelper.js";
import { addThemeChangeListener, getCurrentTheme } from "./theme.js";


//==============================================================================
// 결과 팝업 레이아웃 상수.
//==============================================================================
const BOX_WIDTH = 880;
const BOX_HEIGHT = 760;
const TITLE_FONT = 56;
const SCORE_FONT = 96;
const STAT_FONT = 32;
const STAT_LINE_HEIGHT = 44;
const MAX_STAT_LINES = 6;
const BUTTON_WIDTH = 280;
const BUTTON_HEIGHT = 120;
const BUTTON_GAP = 40;
const BUTTON_FONT = 44;


//==============================================================================
// 결과 팝업.
// - 게임 종료 시 점수 + 통계 라인들 + [나가기 / 다시하기] 두 버튼을 보여주는 전용 팝업.
// - MessagePopup 과는 의미가 달라서 별도 컴포넌트로 분리.
//==============================================================================
export class ResultPopup extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Paint } */ #dimPaint;
	/** @private @type { WorldNode } */ #boxNode;
	/** @private @type { Paint } */ #boxPaint;
	/** @private @type { WorldNode } */ #titleLabelNode;
	/** @private @type { Label } */ #titleLabel;
	/** @private @type { WorldNode } */ #scoreLabelNode;
	/** @private @type { Label } */ #scoreLabel;
	/** @private @type { WorldNode[] } */ #statLabelNodes;
	/** @private @type { Label[] } */ #statLabels;
	/** @private @type { WorldNode } */ #retryButtonNode;
	/** @private @type { Label } */ #retryButtonLabel;
	/** @private @type { WorldNode } */ #exitButtonNode;
	/** @private @type { Label } */ #exitButtonLabel;
	/** @private @type { (() => void) | null } */ #onRetry;
	/** @private @type { (() => void) | null } */ #onExit;
	/** @private @type { boolean } */ #isWon;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setActive(false);
		this.setInteractable(true);

		// 딤.
		this.#dimPaint = this.addComponent(Paint);

		// 박스.
		this.#boxNode = new WorldNode();
		this.#boxNode.setPivot(Pivot.middleCenter);
		this.#boxNode.setAnchor(Pivot.topLeft);
		this.#boxNode.setContentSize(Vector2.create(BOX_WIDTH, BOX_HEIGHT));
		this.#boxPaint = this.#boxNode.addComponent(Paint);
		this.#boxPaint.setRoundSize(28);
		this.addChild(this.#boxNode);

		// 타이틀 (승리/패배 등).
		this.#titleLabelNode = createLabelNode("", TITLE_FONT, Color.createFromHEX("#ffffff"));
		this.#boxNode.addChild(this.#titleLabelNode);
		this.#titleLabel = this.#titleLabelNode.getComponent(Label);

		// 점수 (큰 글씨).
		this.#scoreLabelNode = createLabelNode("", SCORE_FONT, Color.createFromHEX("#ffffff"));
		this.#boxNode.addChild(this.#scoreLabelNode);
		this.#scoreLabel = this.#scoreLabelNode.getComponent(Label);

		// 통계 라인들.
		this.#statLabelNodes = [];
		this.#statLabels = [];
		for (let i = 0; i < MAX_STAT_LINES; ++i) {
			const node = createLabelNode("", STAT_FONT, Color.createFromHEX("#cccccc"));
			this.#boxNode.addChild(node);
			this.#statLabelNodes.push(node);
			this.#statLabels.push(node.getComponent(Label));
		}

		// 다시하기 버튼.
		this.#retryButtonNode = createButtonNode(
			"다시하기",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#5b8def"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT,
			() => { this.handleRetry(); },
		);
		this.#retryButtonLabel = this.#retryButtonNode.getComponent(Label);
		this.#boxNode.addChild(this.#retryButtonNode);

		// 나가기 버튼.
		this.#exitButtonNode = createButtonNode(
			"나가기",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#a04545"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT,
			() => { this.handleExit(); },
		);
		this.#exitButtonLabel = this.#exitButtonNode.getComponent(Label);
		this.#boxNode.addChild(this.#exitButtonNode);

		this.#onRetry = null;
		this.#onExit = null;
		this.#isWon = false;

		addThemeChangeListener((theme) => this.applyTheme(theme));
		this.applyTheme(getCurrentTheme());
	}

	//==============================================================================
	// 테마 색 적용.
	//==============================================================================
	applyTheme(theme) {
		if (this.#dimPaint) {
			this.#dimPaint.setColor(new Color(0, 0, 0, theme.popupDimAlpha));
		}
		if (this.#boxPaint) {
			this.#boxPaint.setColor(Color.createFromHEX(theme.surface));
		}
		if (this.#titleLabel) {
			const titleColor = this.#isWon ? theme.primary : theme.error;
			this.#titleLabel.setTextColor(Color.createFromHEX(titleColor));
		}
		if (this.#scoreLabel) {
			this.#scoreLabel.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		for (const label of this.#statLabels) {
			label.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	//==============================================================================
	// 결과 팝업 노출.
	// options:
	//   - isWon  : boolean
	//   - title  : 메인 타이틀 (예: "승리!" / "게임 오버" / "시간 초과")
	//   - score  : 숫자
	//   - stats  : string[] (통계 라인 텍스트들)
	//   - onRetry: 다시하기 클릭 콜백
	//   - onExit : 나가기 클릭 콜백
	//==============================================================================
	show(options) {
		options = options || {};
		this.#isWon = !!options.isWon;
		this.#titleLabel.setText(options.title || (this.#isWon ? "승리!" : "게임 오버"));
		this.#scoreLabel.setText(`점수 ${options.score != null ? options.score : 0}`);
		const stats = options.stats || [];
		for (let i = 0; i < this.#statLabels.length; ++i) {
			const text = stats[i] || "";
			this.#statLabels[i].setText(text);
			this.#statLabelNodes[i].setActive(text !== "");
		}
		this.#onRetry = options.onRetry || null;
		this.#onExit = options.onExit || null;
		this.setActive(true);
		// 타이틀 색이 isWon 에 따라 달라지므로 테마 재적용.
		this.applyTheme(getCurrentTheme());
		this.layout();
	}

	//==============================================================================
	// 닫기.
	//==============================================================================
	hide() {
		this.setActive(false);
	}

	handleRetry() {
		const cb = this.#onRetry;
		this.hide();
		if (cb) cb();
	}

	handleExit() {
		const cb = this.#onExit;
		this.hide();
		if (cb) cb();
	}

	//==============================================================================
	// 활성 여부.
	//==============================================================================
	isShowing() {
		return this.isActive();
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		this.#boxNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5));

		const padding = 60;
		let cursorY = padding + TITLE_FONT * 0.5;
		this.#titleLabelNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, cursorY));

		cursorY += TITLE_FONT * 0.5 + 24 + SCORE_FONT * 0.5;
		this.#scoreLabelNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, cursorY));

		// 통계 라인 (세로 누적).
		cursorY += SCORE_FONT * 0.5 + 30;
		for (let i = 0; i < this.#statLabels.length; ++i) {
			cursorY += STAT_LINE_HEIGHT * 0.5;
			this.#statLabelNodes[i].setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, cursorY));
			cursorY += STAT_LINE_HEIGHT * 0.5;
		}

		// 버튼 (박스 하단).
		const buttonY = BOX_HEIGHT - padding - BUTTON_HEIGHT * 0.5;
		const totalWidth = BUTTON_WIDTH * 2 + BUTTON_GAP;
		const left = (BOX_WIDTH - totalWidth) * 0.5 + BUTTON_WIDTH * 0.5;
		this.#exitButtonNode.setLocalPosition(Vector2.create(left, buttonY));
		this.#retryButtonNode.setLocalPosition(Vector2.create(left + BUTTON_WIDTH + BUTTON_GAP, buttonY));
	}

	//==============================================================================
	// 입력 가로채기. (배경 클릭 무반응)
	//==============================================================================
	touchPress() {}
	touchMove() {}
	touchRelease() {}
	touchCancel() {}
}
