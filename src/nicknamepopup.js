//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Text } from "../libs/vanilla.js/src/core/component/text.js";
import { UIInputField } from "../libs/vanilla.js/src/ui/uiinputfield.js";
import { createButtonNode, createTextNode, getDefaultFontFace } from "./uihelper.js";
import { addThemeChangeListener, getCurrentTheme } from "./theme.js";
import { setNickname, NICKNAME_MAX_LENGTH } from "./userprofile.js";


//==============================================================================
// 레이아웃 상수.
//==============================================================================
const BOX_WIDTH = 880;
const BOX_HEIGHT = 620;
const BUTTON_WIDTH = 320;
const BUTTON_HEIGHT = 120;
const TITLE_FONT_SIZE = 56;
const SUB_FONT_SIZE = 32;
const BUTTON_FONT_SIZE = 44;
const INPUT_AREA_WIDTH = 640;
const INPUT_AREA_HEIGHT = 120;
const INPUT_FONT_SIZE = 48;


//==============================================================================
// 닉네임 입력 팝업.
// - 입력은 UIInputField (캔버스 렌더 + 숨겨진 DOM input). IME / 모바일 키보드 / 복붙
//   모두 네이티브로 동작하면서 캔버스 위에 자유롭게 그려진다.
//==============================================================================
export class NicknamePopup extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Paint } */ #dimPaint;
	/** @private @type { WorldNode } */ #boxNode;
	/** @private @type { Paint } */ #boxPaint;
	/** @private @type { WorldNode } */ #titleTextNode;
	/** @private @type { Text } */ #titleText;
	/** @private @type { WorldNode } */ #subTextNode;
	/** @private @type { Text } */ #subText;
	/** @private @type { UIInputField } */ #inputField;
	/** @private @type { WorldNode } */ #okButtonNode;
	/** @private @type { Text } */ #okButtonText;
	/** @private @type { (nickname: string) => void | null } */ #onConfirm;
	/** @private @type { * } */ #engine;

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

		this.#titleTextNode = createTextNode("닉네임을 입력해 주세요", TITLE_FONT_SIZE, Color.createFromHEX("#ffffff"));
		this.#boxNode.addChild(this.#titleTextNode);
		this.#titleText = this.#titleTextNode.getComponent(Text);

		this.#subTextNode = createTextNode(`최대 ${NICKNAME_MAX_LENGTH}자까지 입력할 수 있습니다`, SUB_FONT_SIZE, Color.createFromHEX("#cccccc"));
		this.#boxNode.addChild(this.#subTextNode);
		this.#subText = this.#subTextNode.getComponent(Text);

		// 캔버스 입력 위젯. 한글 IME / 모바일 키보드 필요하므로 DOM input 사용.
		this.#inputField = new UIInputField();
		this.#inputField.setUseDOMInput(true);
		this.#inputField.setContentSize(Vector2.create(INPUT_AREA_WIDTH, INPUT_AREA_HEIGHT));
		this.#inputField.setPlaceholder("닉네임");
		this.#inputField.setMaxLength(NICKNAME_MAX_LENGTH);
		this.#inputField.setFontSize(INPUT_FONT_SIZE);
		this.#inputField.setRoundSize(16);
		this.#inputField.setPadding(20);
		const font = getDefaultFontFace();
		if (font) this.#inputField.setFont(font);
		this.#inputField.setOnSubmit(() => this.handleOk());
		this.#boxNode.addChild(this.#inputField);

		this.#okButtonNode = createButtonNode(
			"확인",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#5b8def"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT_SIZE,
			() => this.handleOk(),
		);
		this.#okButtonText = this.#okButtonNode.getComponent(Text);
		this.#boxNode.addChild(this.#okButtonNode);

		this.#onConfirm = null;
		this.#engine = null;

		addThemeChangeListener((theme) => this.applyTheme(theme));
		this.applyTheme(getCurrentTheme());
	}

	//==============================================================================
	// 엔진 주입. (UIInputField 의 DOM input 위치 계산용)
	//==============================================================================
	setEngine(engine) {
		this.#engine = engine;
		if (this.#inputField) this.#inputField.setEngine(engine);
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
		if (this.#titleText) {
			this.#titleText.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		if (this.#subText) {
			this.#subText.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
		if (this.#inputField) {
			this.#inputField.setBackgroundColor(Color.createFromHEX("#ffffff"));
			this.#inputField.setTextColor(Color.createFromHEX("#222222"));
			this.#inputField.setPlaceholderColor(Color.createFromHEX("#999999"));
			this.#inputField.setCursorColor(Color.createFromHEX(theme.primary));
		}
	}

	//==============================================================================
	// 표시.
	//==============================================================================
	/**
	 * @param { string } initialValue
	 * @param { (nickname: string) => void | null } onConfirm
	 */
	show(initialValue, onConfirm) {
		this.#onConfirm = onConfirm || null;
		this.setActive(true);
		this.layout();
		this.#inputField.setText(initialValue || "");
		this.#inputField.attach();
		// 자동 포커스 시도. 모바일 정책상 키보드는 사용자 탭이 있어야 뜰 수 있다.
		setTimeout(() => this.#inputField && this.#inputField.focus(), 0);
	}

	//==============================================================================
	// 닫기.
	//==============================================================================
	hide() {
		this.setActive(false);
		this.#inputField.detach();
	}

	//==============================================================================
	// 노출 여부.
	//==============================================================================
	isShowing() {
		return this.isActive();
	}

	//==============================================================================
	// 확인 처리.
	//==============================================================================
	handleOk() {
		const value = this.#inputField.getText().trim();
		if (value.length === 0) {
			this.#inputField.focus();
			return;
		}
		setNickname(value);
		const callback = this.#onConfirm;
		this.hide();
		if (callback) callback(value);
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		this.#boxNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5));
		this.#titleTextNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.20));
		this.#subTextNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.32));
		// 입력창: 중앙 가로, 박스 세로의 55% 위치를 중심으로.
		const inputLeft = (BOX_WIDTH - INPUT_AREA_WIDTH) * 0.5;
		const inputTop = BOX_HEIGHT * 0.55 - INPUT_AREA_HEIGHT * 0.5;
		this.#inputField.setLocalPosition(Vector2.create(inputLeft, inputTop));
		this.#okButtonNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.82));
	}

	//==============================================================================
	// 팝업 자체는 입력을 모두 흡수. (뒤 파트로 터치가 새지 않도록)
	//==============================================================================
	touchPress() {}
	touchMove() {}
	touchRelease() {}
	touchCancel() {}
}
