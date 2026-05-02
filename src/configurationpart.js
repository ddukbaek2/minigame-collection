//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { Part, PartId } from "./part.js";
import { createButtonNode, createLabelNode } from "./uihelper.js";
import { getAllThemeIds, getTheme, getCurrentThemeId, setCurrentTheme } from "./theme.js";


//==============================================================================
// 레이아웃 상수.
//==============================================================================
const SECTION_LABEL_FONT_SIZE = 56;
const THEME_BUTTON_WIDTH = 280;
const THEME_BUTTON_HEIGHT = 130;
const THEME_BUTTON_GAP = 28;
const THEME_BUTTON_FONT_SIZE = 44;


//==============================================================================
// 설정 파트.
// - 테마 선택 (라이트 / 다크 / 바닐라)
//==============================================================================
export class ConfigurationPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode } */ #themeSectionLabelNode;
	/** @private @type { Label } */ #themeSectionLabel;
	/** @private @type { Array<{ themeId: string, node: WorldNode, paint: Paint, label: Label }> } */ #themeButtons;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#themeSectionLabelNode = null;
		this.#themeSectionLabel = null;
		this.#themeButtons = [];
	}

	getPartId() {
		return PartId.configuration;
	}

	getNavigationTitle() {
		return "설정";
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		// 배경. (테마 자동 적용)
		this.setupBackground();

		// "테마 선택" 섹션 라벨.
		this.#themeSectionLabelNode = createLabelNode("테마 선택", SECTION_LABEL_FONT_SIZE, Color.createFromHEX("#ffffff"));
		this.#themeSectionLabel = this.#themeSectionLabelNode.getComponent(Label);
		this.addChild(this.#themeSectionLabelNode);

		// 테마 버튼들. (라이트 / 다크 / 바닐라)
		const themeIds = getAllThemeIds();
		for (const themeId of themeIds) {
			const theme = getTheme(themeId);
			const node = createButtonNode(
				theme.displayName,
				Vector2.create(THEME_BUTTON_WIDTH, THEME_BUTTON_HEIGHT),
				Color.createFromHEX("#3a3f5b"),
				Color.createFromHEX("#ffffff"),
				THEME_BUTTON_FONT_SIZE,
				() => {
					setCurrentTheme(themeId);
					this.refreshSelection();
				},
			);
			const paint = node.getComponent(Paint);
			const label = node.getComponent(Label);
			this.addChild(node);
			this.#themeButtons.push({ themeId, node, paint, label });
		}

		// 현재 선택 반영.
		this.refreshSelection();
		// 현재 테마 색 반영.
		this.applyTheme(getTheme());
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	enter() {
		this.refreshSelection();
		this.applyTheme(getTheme());
		this.layout();
	}

	//==============================================================================
	// 리사이즈.
	//==============================================================================
	onResize() {
		this.layout();
	}

	//==============================================================================
	// 테마 변경 시 적용. (배경 + 라벨 색 + 버튼 강조)
	//==============================================================================
	applyTheme(theme) {
		super.applyTheme(theme);
		if (this.#themeSectionLabel) {
			this.#themeSectionLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		this.refreshSelection();
	}

	//==============================================================================
	// 선택된 테마 강조.
	// - 미리보기 버튼은 해당 테마의 surfaceVariant 로 칠한다.
	//   현재 화면 배경(background)과 surfaceVariant 는 항상 다른 톤이므로
	//   어느 테마에서도 버튼이 배경에 묻히지 않는다.
	// - 선택된 테마는 primary 외곽 테두리(흉내) + 살짝 확대로 강조.
	//==============================================================================
	refreshSelection() {
		const currentId = getCurrentThemeId();
		const currentTheme = getTheme();
		for (const entry of this.#themeButtons) {
			const isSelected = entry.themeId === currentId;
			const targetTheme = getTheme(entry.themeId);
			// 미리보기 색: 해당 테마의 surfaceVariant + onSurfaceVariant 텍스트.
			entry.paint.setColor(Color.createFromHEX(targetTheme.surfaceVariant));
			entry.label.setTextColor(Color.createFromHEX(targetTheme.onSurfaceVariant));
			entry.paint.setRoundSize(16);
			// 선택된 테마는 살짝 확대해 강조 + 텍스트를 primary 색으로 변경.
			if (isSelected) {
				entry.label.setTextColor(Color.createFromHEX(targetTheme.primary));
				entry.node.setLocalScale(Vector2.create(1.08, 1.08));
			}
			else {
				entry.node.setLocalScale(Vector2.create(1, 1));
			}
		}
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();

		// 섹션 라벨 + 버튼 한 줄을 수직 가운데에 배치.
		const sectionLabelHeight = SECTION_LABEL_FONT_SIZE + 16;
		const sectionGap = 60;
		const buttonRowHeight = THEME_BUTTON_HEIGHT;
		const totalHeight = sectionLabelHeight + sectionGap + buttonRowHeight;
		const top = (contentSize.y - totalHeight) * 0.5;

		// 섹션 라벨.
		this.#themeSectionLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + sectionLabelHeight * 0.5));

		// 버튼 한 줄.
		const buttonCount = this.#themeButtons.length;
		const totalRowWidth = buttonCount * THEME_BUTTON_WIDTH + (buttonCount - 1) * THEME_BUTTON_GAP;
		const rowLeft = (contentSize.x - totalRowWidth) * 0.5 + THEME_BUTTON_WIDTH * 0.5;
		const rowY = top + sectionLabelHeight + sectionGap + buttonRowHeight * 0.5;
		for (let i = 0; i < buttonCount; ++i) {
			const entry = this.#themeButtons[i];
			const x = rowLeft + i * (THEME_BUTTON_WIDTH + THEME_BUTTON_GAP);
			entry.node.setLocalPosition(Vector2.create(x, rowY));
		}
	}
}
