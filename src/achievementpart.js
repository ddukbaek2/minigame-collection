//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Text } from "../libs/vanilla.js/src/core/component/text.js";
import { Part, PartId } from "./part.js";
import { createTextNode } from "./uihelper.js";
import { getTheme } from "./theme.js";
import { getTotalStars, addScoreChangeListener } from "./scoreboard.js";


//==============================================================================
// 업적 파트.
//==============================================================================
export class AchievementPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode } */ #starsNode;
	/** @private @type { Text } */ #starsText;
	/** @private @type { WorldNode } */ #placeholderNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#starsNode = null;
		this.#starsText = null;
		this.#placeholderNode = null;
		addScoreChangeListener(() => this.refreshStars());
	}

	//==============================================================================
	// getPartId.
	//==============================================================================
	getPartId() {
		return PartId.achievement;
	}

	//==============================================================================
	// getNavigationTitle.
	//==============================================================================
	getNavigationTitle() {
		return "업적";
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		this.setupBackground();

		this.#starsNode = createTextNode("⭐ 0", 96, Color.createFromHEX("#ffd700"));
		this.#starsText = this.#starsNode.getComponent(Text);
		this.addChild(this.#starsNode);

		this.#placeholderNode = createTextNode("업적 (준비중)", 40, Color.createFromHEX("#ffffff"));
		this.addChild(this.#placeholderNode);

		this.refreshStars();
		this.applyTheme(getTheme());
	}

	//==============================================================================
	// 별 합계 갱신.
	//==============================================================================
	refreshStars() {
		if (this.#starsText) {
			this.#starsText.setText(`⭐ ${getTotalStars()}`);
		}
	}

	//==============================================================================
	// 테마 색 갱신.
	//==============================================================================
	applyTheme(theme) {
		super.applyTheme(theme);
		if (this.#placeholderNode) {
			this.#placeholderNode.getComponent(Text).setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	enter() {
		this.refreshStars();
		this.layout();
	}

	//==============================================================================
	// 리사이즈.
	//==============================================================================
	onResize() {
		this.layout();
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		const centerX = contentSize.x * 0.5;
		const centerY = contentSize.y * 0.5;
		this.#starsNode.setLocalPosition(Vector2.create(centerX, centerY - 80));
		this.#placeholderNode.setLocalPosition(Vector2.create(centerX, centerY + 80));
	}
}
