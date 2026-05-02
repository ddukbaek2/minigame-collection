//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { Part, PartId } from "./part.js";
import { createLabelNode } from "./uihelper.js";
import { getTheme } from "./theme.js";


//==============================================================================
// 인트로 파트.
// - 타이틀 화면으로 잠시 후 자동 전환된다.
//==============================================================================
const INTRO_DURATION = 1.5;

export class IntroPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { number } */ #elapsed;
	/** @private @type { WorldNode } */ #titleNode;
	/** @private @type { WorldNode } */ #subtitleNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#elapsed = 0;
		this.#titleNode = null;
		this.#subtitleNode = null;
	}

	getPartId() {
		return PartId.intro;
	}

	hasNavigation() {
		return false;
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		// 배경. (테마 자동 적용)
		this.setupBackground();

		// 인트로 전체 영역을 클릭하면 즉시 타이틀로 넘어감.
		this.setInteractable(true);
		const skipButton = this.addComponent(UIButton);
		skipButton.setClickEvent(() => {
			const app = this.getApp();
			app.replacePart(PartId.title);
		});

		this.#titleNode = createLabelNode("미니게임 컬렉션", 88, Color.createFromHEX("#ffffff"));
		this.addChild(this.#titleNode);

		this.#subtitleNode = createLabelNode("Minigame Collection", 44, Color.createFromHEX("#999999"));
		this.addChild(this.#subtitleNode);

		// 현재 테마 색 적용.
		this.applyTheme(getTheme());
	}

	//==============================================================================
	// 테마 색 갱신.
	//==============================================================================
	applyTheme(theme) {
		super.applyTheme(theme);
		if (this.#titleNode) {
			this.#titleNode.getComponent(Label).setTextColor(Color.createFromHEX(theme.primary));
		}
		if (this.#subtitleNode) {
			this.#subtitleNode.getComponent(Label).setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	//==============================================================================
	// 진입.
	//==============================================================================
	enter() {
		this.#elapsed = 0;
		this.layout();
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	tick(timeDelta) {
		super.tick(timeDelta);
		const isActiveInHierarchy = this.isActiveInHierarchy();
		if (isActiveInHierarchy) {
			this.#elapsed += timeDelta;
			if (this.#elapsed >= INTRO_DURATION) {
				const app = this.getApp();
				app.replacePart(PartId.title);
			}
		}
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
		this.#titleNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5 - 30));
		this.#subtitleNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5 + 50));
	}
}
