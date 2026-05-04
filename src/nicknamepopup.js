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
import { createButtonNode, createLabelNode } from "./uihelper.js";
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
// - dim + 박스 + 안내 라벨 + (HTML <input> 오버레이) + 확인 버튼.
// - 캔버스 위에 포지셔닝된 실제 <input> 요소를 띄워 IME(한글) / 모바일 키보드 / 복붙
//   같은 네이티브 텍스트 입력을 그대로 사용한다.
//==============================================================================
export class NicknamePopup extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Paint } */ #dimPaint;
	/** @private @type { WorldNode } */ #boxNode;
	/** @private @type { Paint } */ #boxPaint;
	/** @private @type { WorldNode } */ #titleLabelNode;
	/** @private @type { Label } */ #titleLabel;
	/** @private @type { WorldNode } */ #subLabelNode;
	/** @private @type { Label } */ #subLabel;
	/** @private @type { WorldNode } */ #okButtonNode;
	/** @private @type { Label } */ #okButtonLabel;
	/** @private @type { (nickname: string) => void | null } */ #onConfirm;
	/** @private @type { HTMLInputElement | null } */ #inputElement;
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

		this.#titleLabelNode = createLabelNode("닉네임을 입력해 주세요", TITLE_FONT_SIZE, Color.createFromHEX("#ffffff"));
		this.#boxNode.addChild(this.#titleLabelNode);
		this.#titleLabel = this.#titleLabelNode.getComponent(Label);

		this.#subLabelNode = createLabelNode(`최대 ${NICKNAME_MAX_LENGTH}자까지 입력할 수 있습니다`, SUB_FONT_SIZE, Color.createFromHEX("#cccccc"));
		this.#boxNode.addChild(this.#subLabelNode);
		this.#subLabel = this.#subLabelNode.getComponent(Label);

		this.#okButtonNode = createButtonNode(
			"확인",
			Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#5b8def"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT_SIZE,
			() => this.handleOk(),
		);
		this.#okButtonLabel = this.#okButtonNode.getComponent(Label);
		this.#boxNode.addChild(this.#okButtonNode);

		this.#onConfirm = null;
		this.#inputElement = null;
		this.#engine = null;

		addThemeChangeListener((theme) => this.applyTheme(theme));
		this.applyTheme(getCurrentTheme());
	}

	//==============================================================================
	// 엔진 주입. (HTML input 위치 계산에 ViewManager 가 필요하다.)
	//==============================================================================
	setEngine(engine) {
		this.#engine = engine;
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
			this.#titleLabel.setTextColor(Color.createFromHEX(theme.onSurface));
		}
		if (this.#subLabel) {
			this.#subLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
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
		this.ensureInputElement(initialValue || "");
	}

	//==============================================================================
	// 닫기.
	//==============================================================================
	hide() {
		this.setActive(false);
		this.removeInputElement();
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
		const value = this.#inputElement ? this.#inputElement.value.trim() : "";
		if (value.length === 0) {
			// 빈 입력은 거절. 포커스만 다시 잡아준다.
			if (this.#inputElement) this.#inputElement.focus();
			return;
		}
		setNickname(value);
		const callback = this.#onConfirm;
		this.hide();
		if (callback) callback(value);
	}

	//==============================================================================
	// HTML <input> 요소 준비.
	//==============================================================================
	ensureInputElement(initialValue) {
		if (this.#inputElement) {
			this.#inputElement.value = initialValue;
			this.layoutInputElement();
			System.setTimeout(() => this.#inputElement && this.#inputElement.focus(), 0);
			return;
		}
		const input = System.document.createElement("input");
		input.type = "text";
		input.maxLength = NICKNAME_MAX_LENGTH;
		input.value = initialValue;
		input.placeholder = "닉네임";
		input.autocomplete = "off";
		input.spellcheck = false;
		input.style.position = "absolute";
		input.style.boxSizing = "border-box";
		input.style.zIndex = "1000";
		input.style.outline = "none";
		input.style.border = "2px solid #5b8def";
		input.style.borderRadius = "12px";
		input.style.background = "#ffffff";
		input.style.color = "#222222";
		input.style.textAlign = "center";
		input.style.padding = "0 16px";
		input.style.fontFamily = "inherit";
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				this.handleOk();
			}
		});
		System.document.body.appendChild(input);
		this.#inputElement = input;
		this.layoutInputElement();
		// 모바일 환경에선 사용자 제스처 없이 포커스 시 키보드가 안 뜰 수 있다.
		// 일단 포커스 시도만 해두고, 안 뜨면 사용자가 입력창을 한 번 탭하게 된다.
		System.setTimeout(() => input.focus(), 0);
	}

	//==============================================================================
	// HTML <input> 요소 제거.
	//==============================================================================
	removeInputElement() {
		if (!this.#inputElement) return;
		try {
			if (this.#inputElement.parentNode) {
				this.#inputElement.parentNode.removeChild(this.#inputElement);
			}
		}
		catch (error) {
			// 무시.
		}
		this.#inputElement = null;
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		this.#boxNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5));
		this.#titleLabelNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.20));
		this.#subLabelNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.32));
		// HTML input 영역 중심 = BOX_HEIGHT * 0.55 (이 위치에 input 을 오버레이)
		this.#okButtonNode.setLocalPosition(Vector2.create(BOX_WIDTH * 0.5, BOX_HEIGHT * 0.82));
		this.layoutInputElement();
	}

	//==============================================================================
	// HTML <input> 위치 / 크기 / 폰트 갱신.
	// 캔버스의 view 좌표(박스 중심) → CSS 픽셀로 변환해 절대 위치 지정.
	//==============================================================================
	layoutInputElement() {
		const input = this.#inputElement;
		if (!input || !this.#engine) return;
		const viewManager = this.#engine.getViewManager();
		const canvas = viewManager.getCanvas();
		if (!canvas) return;
		const canvasRect = canvas.getBoundingClientRect();
		const targetScale = viewManager.getTargetResolutionScale() || 1;

		// 박스의 글로벌 view 좌표.
		const boxPosition = this.#boxNode.getPosition();
		const inputCenterX_view = boxPosition.x;
		const inputCenterY_view = boxPosition.y - BOX_HEIGHT * 0.5 + BOX_HEIGHT * 0.55;
		const inputLeft_view = inputCenterX_view - INPUT_AREA_WIDTH * 0.5;
		const inputTop_view = inputCenterY_view - INPUT_AREA_HEIGHT * 0.5;

		// view → CSS 픽셀 (canvas DOM offset 추가).
		const left_css = canvasRect.left + inputLeft_view * targetScale;
		const top_css = canvasRect.top + inputTop_view * targetScale;
		const width_css = INPUT_AREA_WIDTH * targetScale;
		const height_css = INPUT_AREA_HEIGHT * targetScale;

		input.style.left = `${left_css}px`;
		input.style.top = `${top_css}px`;
		input.style.width = `${width_css}px`;
		input.style.height = `${height_css}px`;
		input.style.fontSize = `${INPUT_FONT_SIZE * targetScale}px`;
	}

	//==============================================================================
	// 매 프레임 - 활성 상태에서 캔버스가 리사이즈/스크롤되어도 input 위치를 보정.
	//==============================================================================
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.isActive() && this.#inputElement) {
			this.layoutInputElement();
		}
	}

	//==============================================================================
	// 팝업 자체는 입력을 모두 흡수. (뒤 파트로 터치가 새지 않도록)
	//==============================================================================
	touchPress() {}
	touchMove() {}
	touchRelease() {}
	touchCancel() {}
}
