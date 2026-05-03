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
import { createToggleButtonNode, createLabelNode } from "./uihelper.js";
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
// - 테마 선택 (라이트 / 다크 / 바닐라). 토글 버튼 그룹 (라디오) 형태.
//==============================================================================
export class ConfigurationPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode } */ #themeSectionLabelNode;
	/** @private @type { Label } */ #themeSectionLabel;
	/** @private @type { Array<{ themeId: string, node: WorldNode, paint: Paint, label: Label, button: UIButton }> } */ #themeButtons;

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

		// 테마 토글 버튼들. (라이트 / 다크 / 바닐라). 라디오 그룹.
		const themeIds = getAllThemeIds();
		for (const themeId of themeIds) {
			const theme = getTheme(themeId);
			const node = createToggleButtonNode(
				theme.displayName,
				Vector2.create(THEME_BUTTON_WIDTH, THEME_BUTTON_HEIGHT),
				Color.createFromHEX(theme.surfaceVariant),
				Color.createFromHEX(theme.onSurfaceVariant),
				THEME_BUTTON_FONT_SIZE,
				() => { this.handleThemeToggled(themeId); },
			);
			const paint = node.getComponent(Paint);
			const label = node.getComponent(Label);
			const button = node.getComponent(UIButton);
			this.addChild(node);
			this.#themeButtons.push({ themeId, node, paint, label, button });
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
	// 테마 변경 시 적용.
	//==============================================================================
	applyTheme(theme) {
		super.applyTheme(theme);
		if (this.#themeSectionLabel) {
			this.#themeSectionLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		this.refreshSelection();
	}

	//==============================================================================
	// 토글 버튼 클릭 처리. (라디오: 누른 항목만 켜짐, 나머지는 꺼짐)
	//==============================================================================
	handleThemeToggled(themeId) {
		// 사용자가 이미 선택된 항목을 다시 누른 경우에도 재선택 효과를 유지.
		setCurrentTheme(themeId);
		this.refreshSelection();
	}

	//==============================================================================
	// 선택 상태 동기화. (표준 토큰 기반 on/off 색)
	// - 안 선택(off):  surfaceVariant 배경 + onSurfaceVariant 텍스트
	// - 선택(on):      primary 배경 + onPrimary 텍스트
	// - 모든 토글의 색은 "현재 적용 중인 테마" 의 토큰을 사용한다.
	//   (어떤 테마가 선택돼 있어도 on/off 가 같은 룰로 명확히 구분됨)
	//==============================================================================
	refreshSelection() {
		const currentId = getCurrentThemeId();
		const theme = getTheme();
		const offBgColor = Color.createFromHEX(theme.surfaceVariant);
		const offTextColor = Color.createFromHEX(theme.onSurfaceVariant);
		const onBgColor = Color.createFromHEX(theme.primary);
		const onTextColor = Color.createFromHEX(theme.onPrimary);

		for (const entry of this.#themeButtons) {
			const isSelected = entry.themeId === currentId;
			entry.paint.setRoundSize(16);
			if (isSelected) {
				entry.paint.setColor(onBgColor);
				entry.label.setTextColor(onTextColor);
			}
			else {
				entry.paint.setColor(offBgColor);
				entry.label.setTextColor(offTextColor);
			}
			// UIButton 의 originalColor 캐시 갱신.
			// 안 그러면 다음 frame 의 applyTintProgress 가 stale 한 originalColor 로
			// 라벨 색을 다시 칠해서 깜빡임이 생긴다.
			if (entry.button && typeof entry.button.collectColorTargets === "function") {
				entry.button.collectColorTargets();
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
