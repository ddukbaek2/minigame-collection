//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Text } from "../libs/vanilla.js/src/core/component/text.js";
import { markUseSystemFont } from "./uihelper.js";


//==============================================================================
// 기본값.
//==============================================================================
const DEFAULT_SIZE = 32;
const DEFAULT_FONT_SIZE = 22;
const DEFAULT_ROUND_SIZE = 8;
const DEFAULT_BACKGROUND_COLOR_HEX = "#e53935";
const DEFAULT_TEXT_COLOR_HEX = "#ffffff";
const DEFAULT_TEXT = "N";


//==============================================================================
// 신규 알림 뱃지.
// - 빨간 사각형 안에 흰색 "N" 라벨이 그려진다.
// - 텍스트 / 배경색 / 글자색 / 글자 크기 / 모서리 둥글기는 setter 로 변경 가능.
// - WorldNode 를 상속하므로 다른 노드의 자식으로 추가하면 어디든 배치 가능.
//==============================================================================
export class NewBadge extends WorldNode {
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.setPivot(Pivot.middleCenter);
		this.setAnchor(Pivot.middleCenter);
		this.setContentSize(Vector2.create(DEFAULT_SIZE, DEFAULT_SIZE));

		this.#paint = this.addComponent(Paint);
		this.#paint.setColor(Color.createFromHEX(DEFAULT_BACKGROUND_COLOR_HEX));
		this.#paint.setRoundSize(DEFAULT_ROUND_SIZE);

		this.#text = this.addComponent(Text);
		this.#text.setText(DEFAULT_TEXT);
		this.#text.setFontSize(DEFAULT_FONT_SIZE);
		this.#text.setTextColor(Color.createFromHEX(DEFAULT_TEXT_COLOR_HEX));
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		// 짧은 라벨(N, NEW, !, 숫자 등) 기준으로 어떤 환경에서도 일관되게 보이도록
		// 시스템 폰트 fallback 을 사용한다.
		markUseSystemFont(this.#text);
	}

	//==============================================================================
	// 라벨 텍스트 설정.
	//==============================================================================
	/**
	 * @param { string } text
	 */
	setText(text) {
		this.#text.setText(text);
	}

	//==============================================================================
	// 배경색 설정.
	//==============================================================================
	/**
	 * @param { Color } color
	 */
	setBackgroundColor(color) {
		this.#paint.setColor(color);
	}

	//==============================================================================
	// 글자색 설정.
	//==============================================================================
	/**
	 * @param { Color } color
	 */
	setTextColor(color) {
		this.#text.setTextColor(color);
	}

	//==============================================================================
	// 글자 크기 설정.
	//==============================================================================
	/**
	 * @param { number } fontSize
	 */
	setFontSize(fontSize) {
		this.#text.setFontSize(fontSize);
	}

	//==============================================================================
	// 모서리 둥글기 설정.
	//==============================================================================
	/**
	 * @param { number } roundSize
	 */
	setRoundSize(roundSize) {
		this.#paint.setRoundSize(roundSize);
	}
}
