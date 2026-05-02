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
const BOX_WIDTH = 800;
const BOX_HEIGHT = 460;
const BUTTON_WIDTH = 280;
const BUTTON_HEIGHT = 120;
const BUTTON_GAP = 40;
const MESSAGE_FONT_SIZE = 48;
const BUTTON_FONT_SIZE = 48;


//==============================================================================
// 메시지 팝업.
// - 부모(safeArea) 전체를 덮는 dim + 가운데 박스(메시지 + 버튼).
// - showConfirm(message, onYes, onNo): 예/아니오 2버튼.
// - showAlert(message, onOk): 확인 1버튼.
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
	/** @private @type { WorldNode } */ #yesButtonNode;
	/** @private @type { WorldNode } */ #noButtonNode;
	/** @private @type { WorldNode } */ #okButtonNode;
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
		// 활성화 시 입력 차단(아래 컨텐츠 클릭 방지).
		this.setInteractable(true);

		// 딤 배경.
		this.#dimPaint = this.addComponent(Paint);

		// 박스.
		this.#boxNode = new WorldNode();
		this.#boxNode.setPivot(Pivot.middleCenter);
		this.#boxNode.setAnchor(Pivot.topLeft);
		this.#boxNode.setContentSize(Vector2.create(BOX_WIDTH, BOX_HEIGHT));
		this.#boxPaint = this.#boxNode.addComponent(Paint);
		this.#boxPaint.setRoundSize(28);
		this.addChild(this.#boxNode);

		// 메시지.
		this.#messageLabelNode = createLabelNode("", MESSAGE_FONT_SIZE, Color.createFromHEX("#ffffff"));
		this.#boxNode.addChild(this.#messageLabelNode);
		this.#messageLabel = this.#messageLabelNode.getComponent(Label);

		// 예 버튼.
		this.#yesButtonNode = createButtonNode(
			"예",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#a04545"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT_SIZE,
			() => { this.handleYes(); },
		);
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
		this.#boxNode.addChild(this.#okButtonNode);

		this.#onYes = null;
		this.#onNo = null;
		this.#onOk = null;

		// 테마 변경 리스너 + 즉시 적용.
		addThemeChangeListener((theme) => this.applyTheme(theme));
		this.applyTheme(getCurrentTheme());
	}

	//==============================================================================
	// 테마 색 적용. (dim, 박스, 메시지 텍스트)
	//==============================================================================
	/**
	 * @param { object } theme
	 */
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
	}

	//==============================================================================
	// 예/아니오 팝업 노출.
	//==============================================================================
	/**
	 * @param { string } message
	 * @param { (() => void) | null } onYes
	 * @param { (() => void) | null } onNo
	 */
	showConfirm(message, onYes, onNo) {
		this.#messageLabel.setText(message);
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
	// 확인 팝업 노출.
	//==============================================================================
	/**
	 * @param { string } message
	 * @param { (() => void) | null } onOk
	 */
	showAlert(message, onOk) {
		this.#messageLabel.setText(message);
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

	//==============================================================================
	// 예 버튼 처리.
	//==============================================================================
	handleYes() {
		const callback = this.#onYes;
		this.hide();
		if (callback) {
			callback();
		}
	}

	//==============================================================================
	// 아니오 버튼 처리.
	//==============================================================================
	handleNo() {
		const callback = this.#onNo;
		this.hide();
		if (callback) {
			callback();
		}
	}

	//==============================================================================
	// 확인 버튼 처리.
	//==============================================================================
	handleOk() {
		const callback = this.#onOk;
		this.hide();
		if (callback) {
			callback();
		}
	}

	//==============================================================================
	// 활성 여부 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isShowing() {
		return this.isActive();
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();

		// 박스를 영역 가운데에 배치.
		this.#boxNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5));

		// 메시지: 박스 상단 1/3 지점.
		this.#messageLabelNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.38));

		// 버튼: 박스 하단.
		const buttonY = BOX_HEIGHT * 0.72;
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

	//==============================================================================
	// 입력 가로채기. (배경 dim 클릭 시 아무것도 안 함 — 박스 밖으로는 무반응)
	//==============================================================================
	touchPress() {}
	touchMove() {}
	touchRelease() {}
	touchCancel() {}
}
