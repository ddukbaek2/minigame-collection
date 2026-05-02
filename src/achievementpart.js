//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { Part, PartId } from "./part.js";
import { createLabelNode } from "./uihelper.js";
import { getTheme } from "./theme.js";


//==============================================================================
// 업적 파트.
//==============================================================================
export class AchievementPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode } */ #placeholderNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#placeholderNode = null;
	}

	getPartId() {
		return PartId.achievement;
	}

	getNavigationTitle() {
		return "업적";
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		this.setupBackground();

		this.#placeholderNode = createLabelNode("업적 (준비중)", 56, Color.createFromHEX("#ffffff"));
		this.addChild(this.#placeholderNode);

		this.applyTheme(getTheme());
	}

	//==============================================================================
	// 테마 색 갱신.
	//==============================================================================
	applyTheme(theme) {
		super.applyTheme(theme);
		if (this.#placeholderNode) {
			this.#placeholderNode.getComponent(Label).setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	enter() {
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
		this.#placeholderNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5));
	}
}
