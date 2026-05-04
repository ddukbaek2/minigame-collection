//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { UIToggleButton } from "../libs/vanilla.js/src/ui/uitogglebutton.js";


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
// 라벨에 "시스템 폰트 사용" 마커 부착. (이모지/특수문자 fallback이 필요한 경우)
// - 이 마커가 붙은 라벨은 applyDefaultFontToAllLabels 가 건너뛴다.
//==============================================================================
/**
 * @param { Label } label
 */
export function markUseSystemFont(label) {
	if (label) {
		label.useSystemFont = true;
	}
}


//==============================================================================
// 라벨이 시스템 폰트 사용 마커가 부착됐는지 여부 반환.
//==============================================================================
/**
 * @param { Label } label
 * @returns { boolean }
 */
export function isUseSystemFont(label) {
	return label && label.useSystemFont === true;
}


//==============================================================================
// 아이콘(이모지) 라벨 노드 생성. 시스템 폰트 fallback을 사용.
//==============================================================================
/**
 * @param { string } text
 * @param { number } fontSize
 * @param { Color } color
 * @returns { WorldNode }
 */
export function createIconLabelNode(text, fontSize, color) {
	const node = new WorldNode();
	node.setPivot(Pivot.middleCenter);
	node.setAnchor(Pivot.middleCenter);
	const label = node.addComponent(Label);
	label.setText(text);
	label.setFontSize(fontSize);
	label.setTextColor(color);
	label.setTextAlign("center");
	label.setTextBaseline("middle");
	markUseSystemFont(label);
	return node;
}


//==============================================================================
// 아이콘(이모지) 버튼 노드 생성. 시스템 폰트 fallback을 사용.
//==============================================================================
/**
 * @param { string } icon
 * @param { Vector2 } size
 * @param { Color } backgroundColor
 * @param { Color } iconColor
 * @param { number } fontSize
 * @param { (button: UIButton) => void } onClick
 * @returns { WorldNode }
 */
export function createIconButtonNode(icon, size, backgroundColor, iconColor, fontSize, onClick) {
	const node = new WorldNode();
	node.setPivot(Pivot.middleCenter);
	node.setAnchor(Pivot.middleCenter);
	node.setContentSize(size);
	node.setInteractable(true);

	const paint = node.addComponent(Paint);
	paint.setColor(backgroundColor);
	paint.setRoundSize(16);

	const label = node.addComponent(Label);
	label.setText(icon);
	label.setFontSize(fontSize);
	label.setTextColor(iconColor);
	label.setTextAlign("center");
	label.setTextBaseline("middle");
	markUseSystemFont(label);

	const button = node.addComponent(UIButton);
	button.setClickEvent(onClick);

	return node;
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
// 토글 버튼 노드 생성. (배경 + 라벨 + UIButton)
// - 라디오 그룹용. 토글 상태(on/off) 색은 외부에서 paint/label 색을 직접 갱신.
// - UIButton 의 pressedTintColor 를 transparent 로 두어 매 tick tint 가 라벨 색을
//   덮어쓰는 일이 없도록 한다. (UIToggleButton 을 쓰면 자동 토글/tint 사이클이
//   외부 색 갱신과 충돌해 라벨 색이 깜빡이는 문제가 있음)
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
export function createToggleButtonNode(text, size, backgroundColor, textColor, fontSize, onClick) {
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
	button.setPressedTintColor(Color.transparent());
	button.setClickEvent(onClick);

	return node;
}


//==============================================================================
// 아이콘 + 텍스트 버튼 노드 생성.
// - 단일 라벨로 "이모지 + 텍스트" 를 중앙정렬하면 이모지의 measured width 와 실제
//   렌더 폭 차이로 시각적으로 한쪽으로 쏠려 보인다. 이를 피하기 위해 아이콘을
//   right-aligned, 텍스트를 left-aligned 로 두 라벨로 나눠 버튼 중앙 양쪽에 배치한다.
// - 아이콘은 시스템 폰트(이모지 fallback), 텍스트는 기본 폰트.
//==============================================================================
/**
 * @param { string } icon
 * @param { string } text
 * @param { Vector2 } size
 * @param { Color } backgroundColor
 * @param { Color } textColor
 * @param { number } fontSize
 * @param { (button: UIButton) => void } onClick
 * @param { number } [gap]
 * @returns { WorldNode }
 */
export function createIconTextButtonNode(icon, text, size, backgroundColor, textColor, fontSize, onClick, gap) {
	const node = new WorldNode();
	node.setPivot(Pivot.middleCenter);
	node.setAnchor(Pivot.middleCenter);
	node.setContentSize(size);
	node.setInteractable(true);

	const paint = node.addComponent(Paint);
	paint.setColor(backgroundColor);
	paint.setRoundSize(16);

	const halfGap = (typeof gap === "number" ? gap : 16) * 0.5;
	const centerX = size.x * 0.5;
	const centerY = size.y * 0.5;

	// 아이콘: 오른쪽 끝이 (중앙 - halfGap) 에 닿도록 right-aligned.
	const iconNode = new WorldNode();
	iconNode.setPivot(Pivot.middleCenter);
	iconNode.setAnchor(Pivot.topLeft);
	iconNode.setLocalPosition(Vector2.create(centerX - halfGap, centerY));
	const iconLabel = iconNode.addComponent(Label);
	iconLabel.setText(icon);
	iconLabel.setFontSize(fontSize);
	iconLabel.setTextColor(textColor);
	iconLabel.setTextAlign("right");
	iconLabel.setTextBaseline("middle");
	markUseSystemFont(iconLabel);
	node.addChild(iconNode);

	// 텍스트: 왼쪽 끝이 (중앙 + halfGap) 에 닿도록 left-aligned.
	const textNode = new WorldNode();
	textNode.setPivot(Pivot.middleCenter);
	textNode.setAnchor(Pivot.topLeft);
	textNode.setLocalPosition(Vector2.create(centerX + halfGap, centerY));
	const textLabel = textNode.addComponent(Label);
	textLabel.setText(text);
	textLabel.setFontSize(fontSize);
	textLabel.setTextColor(textColor);
	textLabel.setTextAlign("left");
	textLabel.setTextBaseline("middle");
	if (defaultFontFace) {
		textLabel.setFont(defaultFontFace);
	}
	node.addChild(textNode);

	const button = node.addComponent(UIButton);
	button.setClickEvent(onClick);

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
