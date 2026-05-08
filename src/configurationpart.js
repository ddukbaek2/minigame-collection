//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { UIScrollView, ScrollMode } from "../libs/vanilla.js/src/ui/uiscrollview.js";
import { Part, PartId } from "./part.js";
import { createToggleButtonNode, createLabelNode } from "./uihelper.js";
import { getNickname } from "./userprofile.js";
import {
	getAllThemeIds,
	getTheme,
	getCurrentUITheme,
	getCurrentUIThemeId,
	setCurrentUITheme,
	getCurrentGameThemeId,
	setCurrentGameTheme,
} from "./theme.js";
import {
	SettingId,
	LanguageId,
	getSetting,
	setSetting,
} from "./settings.js";


//==============================================================================
// 레이아웃 상수.
//==============================================================================
const SECTION_TITLE_FONT_SIZE = 44;
const SECTION_TITLE_HEIGHT = 60;
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 100;
const ACTION_BUTTON_WIDTH = 520;
const BUTTON_FONT_SIZE = 36;
const BUTTON_GAP = 16;
const SECTION_INNER_GAP = 16;
const SECTION_OUTER_GAP = 40;
const HORIZONTAL_PADDING = 32;
const DANGER_COLOR = "#a04545";


//==============================================================================
// 설정 파트.
// - 모든 항목을 ScrollView 안에 수직으로 배치.
// - 항목: UI 테마 / 게임 테마 / 배경음 / 효과음 / 진동 / 언어.
//==============================================================================
export class ConfigurationPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode } */ #scrollContainerNode;
	/** @private @type { UIScrollView } */ #scrollView;
	/** @private @type { Array<object> } */ #sections;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#scrollContainerNode = null;
		this.#scrollView = null;
		this.#sections = [];
	}

	getPartId() { return PartId.configuration; }
	getNavigationTitle() { return "설정"; }

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		this.setupBackground();

		// 스크롤 컨테이너. UIScrollView 의 require(Mask) 가 자동으로 클리핑을 켜준다.
		this.#scrollContainerNode = new WorldNode();
		this.#scrollContainerNode.setName("settingsScroll");
		this.#scrollContainerNode.setPivot(Pivot.topLeft);
		this.addChild(this.#scrollContainerNode);

		this.#scrollView = this.#scrollContainerNode.addComponent(UIScrollView);
		this.#scrollView.setHorizontal(false);
		this.#scrollView.setVertical(true);
		this.#scrollView.setScrollMode(ScrollMode.elastic);
		// 스크롤뷰가 자체 배경을 그리지 않도록 (UIView 기본 흰색이 part 배경을 가림).
		this.#scrollView.setBackgroundColor(Color.transparent());
		// 세로 스크롤바 자동 생성 / 관리.
		this.#scrollView.setShowsVerticalScrollBar(true);

		// 섹션들.
		this.#sections = [];

		// 닉네임 변경 (맨 위).
		this.#sections.push(this.createActionSection(
			"닉네임 변경",
			() => getNickname() || "(미설정)",
			"action",
			() => this.handleChangeNickname(),
		));

		this.#sections.push(this.createSection(
			"UI 테마",
			getAllThemeIds().map((id) => ({ id, label: getTheme(id).displayName })),
			() => getCurrentUIThemeId(),
			(id) => { setCurrentUITheme(id); this.refreshAllSections(); },
		));
		this.#sections.push(this.createSection(
			"게임 테마",
			getAllThemeIds().map((id) => ({ id, label: getTheme(id).displayName })),
			() => getCurrentGameThemeId(),
			(id) => { setCurrentGameTheme(id); this.refreshAllSections(); },
		));
		this.#sections.push(this.createSection(
			"배경음",
			[
				{ id: true,  label: "켜기" },
				{ id: false, label: "끄기" },
			],
			() => !!getSetting(SettingId.bgmEnabled),
			(value) => { setSetting(SettingId.bgmEnabled, value); this.refreshAllSections(); },
		));
		this.#sections.push(this.createSection(
			"효과음",
			[
				{ id: true,  label: "켜기" },
				{ id: false, label: "끄기" },
			],
			() => !!getSetting(SettingId.sfxEnabled),
			(value) => { setSetting(SettingId.sfxEnabled, value); this.refreshAllSections(); },
		));
		this.#sections.push(this.createSection(
			"진동",
			[
				{ id: true,  label: "켜기" },
				{ id: false, label: "끄기" },
			],
			() => !!getSetting(SettingId.vibrationEnabled),
			(value) => { setSetting(SettingId.vibrationEnabled, value); this.refreshAllSections(); },
		));
		this.#sections.push(this.createSection(
			"언어",
			[
				{ id: LanguageId.ko, label: "한국어" },
				{ id: LanguageId.en, label: "English" },
			],
			() => getSetting(SettingId.language),
			(id) => { setSetting(SettingId.language, id); this.refreshAllSections(); },
		));

		// 모든 데이터 초기화 (맨 아래, 위험).
		this.#sections.push(this.createActionSection(
			"데이터",
			() => "모든 데이터 초기화",
			"danger",
			() => this.handleResetAllData(),
		));

		// 각 섹션 노드를 스크롤 콘텐츠에 추가.
		const content = this.#scrollView.getContent();
		for (const section of this.#sections) {
			content.addChild(section.node);
		}

		this.refreshAllSections();
		this.applyTheme(getCurrentUITheme());
	}

	//==============================================================================
	// 한 섹션 생성. 제목 라벨 + 옵션 토글 버튼들 (라디오 그룹).
	// - options: [{ id: any, label: string }]
	// - getCurrentValue(): 현재 선택된 id
	// - onSelect(id): 사용자가 옵션을 선택했을 때 호출
	//==============================================================================
	/**
	 * @returns { object }
	 */
	createSection(title, options, getCurrentValue, onSelect) {
		const node = new WorldNode();
		node.setPivot(Pivot.topLeft);
		node.setAnchor(Pivot.topLeft);

		// 제목 라벨. (가운데 정렬 — createLabelNode 기본값 유지)
		const titleNode = createLabelNode(title, SECTION_TITLE_FONT_SIZE, Color.createFromHEX("#ffffff"));
		node.addChild(titleNode);

		// 옵션 버튼들.
		const buttons = [];
		for (const option of options) {
			const buttonNode = createToggleButtonNode(
				option.label,
				Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
				Color.createFromHEX("#3a3f5b"),
				Color.createFromHEX("#ffffff"),
				BUTTON_FONT_SIZE,
				() => { onSelect(option.id); },
			);
			node.addChild(buttonNode);
			buttons.push({
				id: option.id,
				node: buttonNode,
				paint: buttonNode.getComponent(Paint),
				label: buttonNode.getComponent(Label),
				button: buttonNode.getComponent(UIButton),
			});
		}

		return {
			kind: "radio",
			node,
			titleNode,
			titleLabel: titleNode.getComponent(Label),
			buttons,
			buttonWidth: BUTTON_WIDTH,
			getCurrentValue,
		};
	}

	//==============================================================================
	// 액션 섹션 생성. 단일 버튼.
	// - kind: "action" → 테마 primary 색.
	// - kind: "danger" → 위험(빨강) 색.
	// - getButtonText: 매 refresh 마다 호출돼 버튼 라벨이 동적으로 갱신된다.
	//==============================================================================
	/**
	 * @param { string } title
	 * @param { () => string } getButtonText
	 * @param { "action" | "danger" } kind
	 * @param { () => void } onClick
	 * @returns { object }
	 */
	createActionSection(title, getButtonText, kind, onClick) {
		const node = new WorldNode();
		node.setPivot(Pivot.topLeft);
		node.setAnchor(Pivot.topLeft);

		const titleNode = createLabelNode(title, SECTION_TITLE_FONT_SIZE, Color.createFromHEX("#ffffff"));
		node.addChild(titleNode);

		const buttonNode = createToggleButtonNode(
			"",
			Vector2.create(ACTION_BUTTON_WIDTH, BUTTON_HEIGHT),
			Color.createFromHEX("#3a3f5b"),
			Color.createFromHEX("#ffffff"),
			BUTTON_FONT_SIZE,
			() => { onClick(); },
		);
		node.addChild(buttonNode);

		return {
			kind,
			node,
			titleNode,
			titleLabel: titleNode.getComponent(Label),
			buttons: [{
				id: null,
				node: buttonNode,
				paint: buttonNode.getComponent(Paint),
				label: buttonNode.getComponent(Label),
				button: buttonNode.getComponent(UIButton),
				getButtonText,
			}],
			buttonWidth: ACTION_BUTTON_WIDTH,
			getCurrentValue: () => null,
		};
	}

	//==============================================================================
	// 닉네임 변경 클릭.
	//==============================================================================
	handleChangeNickname() {
		const app = this.getApp();
		if (!app || typeof app.showNicknameInput !== "function") return;
		app.showNicknameInput(getNickname(), () => {
			this.refreshAllSections();
		});
	}

	//==============================================================================
	// 모든 데이터 초기화 클릭.
	// - 확인 팝업 → 동의 시 LocalStorage 전체 비우고 페이지 리로드.
	//==============================================================================
	handleResetAllData() {
		const app = this.getApp();
		if (!app) return;
		app.showConfirm(
			"정말 모든 데이터를 초기화하시겠습니까?",
			() => {
				try { System.localStorage.clear(); } catch (error) { /* 무시 */ }
				try { System.location.reload(); } catch (error) { /* 무시 */ }
			},
			null,
			{ subMessage: "닉네임, 설정, 진행 기록이 모두 사라집니다." },
		);
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	enter() {
		this.applyTheme(getCurrentUITheme());
		this.layout();
		// 스크롤 위치 초기화.
		if (this.#scrollView) {
			this.#scrollView.setScrollOffset(Vector2.zero());
		}
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
		// 모든 섹션 색 갱신.
		this.refreshAllSections();
	}

	//==============================================================================
	// 모든 섹션의 라디오 강조 + 색상 갱신.
	//==============================================================================
	refreshAllSections() {
		const theme = getCurrentUITheme();
		const offBg = Color.createFromHEX(theme.surfaceVariant);
		const offText = Color.createFromHEX(theme.onSurfaceVariant);
		const onBg = Color.createFromHEX(theme.primary);
		const onText = Color.createFromHEX(theme.onPrimary);
		const dangerBg = Color.createFromHEX(DANGER_COLOR);
		const dangerText = Color.createFromHEX("#ffffff");
		const titleColor = Color.createFromHEX(theme.onBackground);

		for (const section of this.#sections) {
			if (section.titleLabel) {
				section.titleLabel.setTextColor(titleColor);
			}
			if (section.kind === "action") {
				const entry = section.buttons[0];
				if (entry.getButtonText) {
					entry.label.setText(entry.getButtonText());
				}
				entry.paint.setRoundSize(16);
				entry.paint.setColor(onBg);
				entry.label.setTextColor(onText);
				if (entry.button && typeof entry.button.collectColorTargets === "function") {
					entry.button.collectColorTargets();
				}
				continue;
			}
			if (section.kind === "danger") {
				const entry = section.buttons[0];
				if (entry.getButtonText) {
					entry.label.setText(entry.getButtonText());
				}
				entry.paint.setRoundSize(16);
				entry.paint.setColor(dangerBg);
				entry.label.setTextColor(dangerText);
				if (entry.button && typeof entry.button.collectColorTargets === "function") {
					entry.button.collectColorTargets();
				}
				continue;
			}

			// 기본 (radio).
			const currentValue = section.getCurrentValue();
			for (const entry of section.buttons) {
				const isSelected = entry.id === currentValue;
				entry.paint.setRoundSize(16);
				if (isSelected) {
					entry.paint.setColor(onBg);
					entry.label.setTextColor(onText);
				}
				else {
					entry.paint.setColor(offBg);
					entry.label.setTextColor(offText);
				}
				// UIButton 의 originalColor 캐시 갱신.
				if (entry.button && typeof entry.button.collectColorTargets === "function") {
					entry.button.collectColorTargets();
				}
			}
		}
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		if (!this.#scrollContainerNode || contentSize.x <= 0) return;

		// 스크롤 컨테이너 = 파트 영역 전체.
		this.#scrollContainerNode.setLocalPosition(Vector2.zero());
		this.#scrollContainerNode.setContentSize(contentSize);

		// 가시 영역 = 뷰포트 - 스크롤바 점유 영역.
		const innerSize = this.#scrollView.getInnerContentSize();
		const innerWidth = innerSize.x - HORIZONTAL_PADDING * 2;
		let cursorY = SECTION_OUTER_GAP;

		for (const section of this.#sections) {
			// 섹션 내부 레이아웃.
			const buttonCount = section.buttons.length;
			const buttonWidth = section.buttonWidth || BUTTON_WIDTH;
			const buttonsTotalWidth = buttonCount * buttonWidth + (buttonCount - 1) * BUTTON_GAP;
			const sectionHeight = SECTION_TITLE_HEIGHT + SECTION_INNER_GAP + BUTTON_HEIGHT;

			section.node.setLocalPosition(Vector2.create(HORIZONTAL_PADDING, cursorY));
			section.node.setContentSize(Vector2.create(innerWidth, sectionHeight));

			// 제목 라벨: 섹션 좌상단.
			section.titleNode.setLocalPosition(Vector2.create(innerWidth * 0.5, SECTION_TITLE_HEIGHT * 0.5));

			// 버튼 row: 가운데 정렬.
			const rowLeft = (innerWidth - buttonsTotalWidth) * 0.5 + buttonWidth * 0.5;
			const rowY = SECTION_TITLE_HEIGHT + SECTION_INNER_GAP + BUTTON_HEIGHT * 0.5;
			for (let i = 0; i < buttonCount; ++i) {
				const entry = section.buttons[i];
				const x = rowLeft + i * (buttonWidth + BUTTON_GAP);
				entry.node.setLocalPosition(Vector2.create(x, rowY));
			}

			cursorY += sectionHeight + SECTION_OUTER_GAP;
		}

		// 스크롤 콘텐트 크기 설정. (스크롤바 점유 영역 제외)
		const scrollContentHeight = cursorY;
		this.#scrollView.setScrollContentSize(Vector2.create(innerSize.x, scrollContentHeight));
	}
}
