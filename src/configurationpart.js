//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Part, PartId } from "./part.js";
import { createLabelNode } from "./uihelper.js";


//==============================================================================
// 설정 파트.
//==============================================================================
export class ConfigurationPart extends Part {
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
		return PartId.configuration;
	}

	getNavigationTitle() {
		return "설정";
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		const background = this.addComponent(Paint);
		background.setColor(Color.createFromHEX("#23323a"));

		this.#placeholderNode = createLabelNode("설정 (준비중)", 56, Color.createFromHEX("#cde0e4"));
		this.addChild(this.#placeholderNode);
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
