//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { UIButton } from "../libs/vanilla.js/src/core/component/uibutton.js";


//==============================================================================
// 기본 폰트.
//==============================================================================
/** @type { FontFace | null } */
let defaultFontFace = null;


//==============================================================================
// 기본 폰트 설정. (메인 씬에서 폰트 로드 후 호출)
//==============================================================================
/**
 * @param { FontFace | null } fontFace
 */
export function setDefaultFontFace(fontFace) {
	defaultFontFace = fontFace;
}


//==============================================================================
// 기본 폰트 반환.
//==============================================================================
/**
 * @returns { FontFace | null }
 */
export function getDefaultFontFace() {
	return defaultFontFace;
}


//==============================================================================
// 단순 라벨 노드 생성.
//==============================================================================
/**
 * @param { string } text
 * @param { number } fontSize
 * @param { Color } color
 * @returns { WorldNode }
 */
export function createLabelNode(text, fontSize, color) {
	const node = new WorldNode();
	node.setPivot(Pivot.middleCenter);
	node.setAnchor(Pivot.middleCenter);
	const label = node.addComponent(Label);
	label.setText(text);
	label.setFontSize(fontSize);
	label.setTextColor(color);
	label.setTextAlign("center");
	label.setTextBaseline("middle");
	if (defaultFontFace) {
		label.setFont(defaultFontFace);
	}
	return node;
}


//==============================================================================
// 버튼 노드 생성. (배경 + 라벨 + UIButton)
//==============================================================================
/**
 * @param { string } text
 * @param { Vector2 } size
 * @param { Color } backgroundColor
 * @param { Color } textColor
 * @param { number } fontSize
 * @param { (button: UIButton) => void } onClick
 * @returns { WorldNode }
 */
export function createButtonNode(text, size, backgroundColor, textColor, fontSize, onClick) {
	const node = new WorldNode();
	node.setPivot(Pivot.middleCenter);
	node.setAnchor(Pivot.middleCenter);
	node.setContentSize(size);
	node.setInteractable(true);

	const paint = node.addComponent(Paint);
	paint.setColor(backgroundColor);
	paint.setRoundSize(16);

	const label = node.addComponent(Label);
	label.setText(text);
	label.setFontSize(fontSize);
	label.setTextColor(textColor);
	label.setTextAlign("center");
	label.setTextBaseline("middle");
	if (defaultFontFace) {
		label.setFont(defaultFontFace);
	}

	const button = node.addComponent(UIButton);
	button.setClickEvent(onClick);

	return node;
}
