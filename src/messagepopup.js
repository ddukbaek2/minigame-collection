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
// 팝업 레이아웃 상수.
//==============================================================================
const BOX_WIDTH = 880;
const BOX_HEIGHT = 540;
const BUTTON_WIDTH = 280;
const BUTTON_HEIGHT = 120;
const BUTTON_GAP = 40;
const MESSAGE_FONT_SIZE = 48;
const SUB_MESSAGE_FONT_SIZE = 32;
const BUTTON_FONT_SIZE = 44;


//==============================================================================
// 메시지 팝업.
// - dim + 가운데 박스 (메시지 + 서브 메시지 + 버튼).
// - showConfirm(message, onYes, onNo, options): 예/아니오 2버튼.
//   options = { yesLabel, noLabel, subMessage }
// - showAlert(message, onOk, options): 확인 1버튼.
//   options = { okLabel, subMessage }
//==============================================================================
export class MessagePopup extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Paint } */ #dimPaint;
	/** @private @type { WorldNode } */ #boxNode;
	/** @private @type { Paint } */ #boxPaint;
	/** @private @type { WorldNode } */ #messageLabelNode;
	/** @private @type { Label } */ #messageLabel;
	/** @private @type { WorldNode } */ #subMessageLabelNode;
	/** @private @type { Label } */ #subMessageLabel;
	/** @private @type { WorldNode } */ #yesButtonNode;
	/** @private @type { Label } */ #yesButtonLabel;
	/** @private @type { WorldNode } */ #noButtonNode;
	/** @private @type { Label } */ #noButtonLabel;
	/** @private @type { WorldNode } */ #okButtonNode;
	/** @private @type { Label } */ #okButtonLabel;
	/** @private @type { (() => void) | null } */ #onYes;
	/** @private @type { (() => void) | null } */ #onNo;
	/** @private @type { (() => void) | null } */ #onOk;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setActive(false);
		this.setInteractable(true);

		this.#dimPaint = this.addComponent(Paint);

		this.#boxNode = new WorldNode();
		this.#boxNode.setPivot(Pivot.middleCenter);
		this.#boxNode.setAnchor(Pivot.topLeft);
		this.#boxNode.setContentSize(Vector2.create(BOX_WIDTH, BOX_HEIGHT));
		this.#boxPaint = this.#boxNode.addComponent(Paint);
		this.#boxPaint.setRoundSize(28);
		this.addChild(this.#boxNode);

		// 메시지 (메인).
		this.#messageLabelNode = createLabelNode("", MESSAGE_FONT_SIZE, Color.createFromHEX("#ffffff"));
		this.#boxNode.addChild(this.#messageLabelNode);
		this.#messageLabel = this.#messageLabelNode.getComponent(Label);

		// 서브 메시지. (점수 데이터 같은 부가 정보)
		this.#subMessageLabelNode = createLabelNode("", SUB_MESSAGE_FONT_SIZE, Color.createFromHEX("#cccccc"));
		this.#boxNode.addChild(this.#subMessageLabelNode);
		this.#subMessageLabel = this.#subMessageLabelNode.getComponent(Label);

		// 예 버튼.
		this.#yesButtonNode = createButtonNode(
			"예",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#a04545"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT_SIZE,
			() => { this.handleYes(); },
		);
		this.#yesButtonLabel = this.#yesButtonNode.getComponent(Label);
		this.#boxNode.addChild(this.#yesButtonNode);

		// 아니오 버튼.
		this.#noButtonNode = createButtonNode(
			"아니오",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#3a3f5b"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT_SIZE,
			() => { this.handleNo(); },
		);
		this.#noButtonLabel = this.#noButtonNode.getComponent(Label);
		this.#boxNode.addChild(this.#noButtonNode);

		// 확인 버튼.
		this.#okButtonNode = createButtonNode(
			"확인",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#5b8def"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT_SIZE,
			() => { this.handleOk(); },
		);
		this.#okButtonLabel = this.#okButtonNode.getComponent(Label);
		this.#boxNode.addChild(this.#okButtonNode);

		this.#onYes = null;
		this.#onNo = null;
		this.#onOk = null;

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
		if (this.#messageLabel) {
			this.#messageLabel.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		if (this.#subMessageLabel) {
			this.#subMessageLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	//==============================================================================
	// 예/아니오 팝업.
	//==============================================================================
	/**
	 * @param { string } message
	 * @param { (() => void) | null } onYes
	 * @param { (() => void) | null } [onNo]
	 * @param { { yesLabel?: string, noLabel?: string, subMessage?: string } } [options]
	 */
	showConfirm(message, onYes, onNo, options) {
		options = options || {};
		this.#messageLabel.setText(message);
		this.#subMessageLabel.setText(options.subMessage || "");
		this.#yesButtonLabel.setText(options.yesLabel || "예");
		this.#noButtonLabel.setText(options.noLabel || "아니오");
		this.#onYes = onYes || null;
		this.#onNo = onNo || null;
		this.#onOk = null;
		this.#yesButtonNode.setActive(true);
		this.#noButtonNode.setActive(true);
		this.#okButtonNode.setActive(false);
		this.setActive(true);
		this.layout();
	}

	//==============================================================================
	// 확인 팝업.
	//==============================================================================
	/**
	 * @param { string } message
	 * @param { (() => void) | null } [onOk]
	 * @param { { okLabel?: string, subMessage?: string } } [options]
	 */
	showAlert(message, onOk, options) {
		options = options || {};
		this.#messageLabel.setText(message);
		this.#subMessageLabel.setText(options.subMessage || "");
		this.#okButtonLabel.setText(options.okLabel || "확인");
		this.#onYes = null;
		this.#onNo = null;
		this.#onOk = onOk || null;
		this.#yesButtonNode.setActive(false);
		this.#noButtonNode.setActive(false);
		this.#okButtonNode.setActive(true);
		this.setActive(true);
		this.layout();
	}

	//==============================================================================
	// 닫기.
	//==============================================================================
	hide() {
		this.setActive(false);
	}

	handleYes() {
		const cb = this.#onYes;
		this.hide();
		if (cb) cb();
	}
	handleNo() {
		const cb = this.#onNo;
		this.hide();
		if (cb) cb();
	}
	handleOk() {
		const cb = this.#onOk;
		this.hide();
		if (cb) cb();
	}

	isShowing() {
		return this.isActive();
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		this.#boxNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5));

		// 메시지: 박스 상단부.
		this.#messageLabelNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.30));

		// 서브 메시지: 메시지 아래.
		this.#subMessageLabelNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.55));

		// 버튼: 박스 하단.
		const buttonY = BOX_HEIGHT * 0.80;
		if (this.#okButtonNode.isActive()) {
			this.#okButtonNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, buttonY));
		}
		else {
			const totalWidth = BUTTON_WIDTH * 2 + BUTTON_GAP;
			const left = (BOX_WIDTH - totalWidth) * 0.5 + BUTTON_WIDTH * 0.5;
			this.#noButtonNode.setLocalPosition(Vector2.create(left, buttonY));
			this.#yesButtonNode.setLocalPosition(Vector2.create(left + BUTTON_WIDTH + BUTTON_GAP, buttonY));
		}
	}

	touchPress() {}
	touchMove() {}
	touchRelease() {}
	touchCancel() {}
}
