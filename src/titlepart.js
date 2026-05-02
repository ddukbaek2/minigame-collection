//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Part, PartId } from "./part.js";
import { createButtonNode, createLabelNode } from "./uihelper.js";


//==============================================================================
// 타이틀 파트.
// - 메인 메뉴.
//==============================================================================
const BUTTON_WIDTH = 720;
const BUTTON_HEIGHT = 160;
const BUTTON_GAP = 40;

export class TitlePart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode } */ #titleLabelNode;
	/** @private @type { WorldNode[] } */ #buttonNodes;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#titleLabelNode = null;
		this.#buttonNodes = [];
	}

	getPartId() {
		return PartId.title;
	}

	hasNavigation() {
		return false;
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		// 배경.
		const background = this.addComponent(Paint);
		background.setColor(Color.createFromHEX("#262a3f"));

		// 게임 이름.
		this.#titleLabelNode = createLabelNode("미니게임 컬렉션", 80, Color.createFromHEX("#ffe9a8"));
		this.addChild(this.#titleLabelNode);

		// 메뉴 버튼들. (시작, 일일미션, 업적, 설정, 종료 순)
		const app = this.getApp();
		const menuItems = [
			{ text: "시작", color: "#5b8def", onClick: () => { app.pushPart(PartId.games); } },
			{ text: "일일미션", color: "#4caf82", onClick: () => { app.pushPart(PartId.dailyMission); } },
			{ text: "업적", color: "#c98a3f", onClick: () => { app.pushPart(PartId.achievement); } },
			{ text: "설정", color: "#7a7e96", onClick: () => { app.pushPart(PartId.configuration); } },
			{ text: "종료", color: "#a04545", onClick: () => { this.handleQuit(); } },
		];

		for (const item of menuItems) {
			const node = createButtonNode(
				item.text,
				Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
				Color.createFromHEX(item.color),
				Color.createFromHEX("#ffffff"),
				64,
				item.onClick,
			);
			this.addChild(node);
			this.#buttonNodes.push(node);
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
		const buttonCount = this.#buttonNodes.length;
		const totalButtonsHeight = buttonCount * BUTTON_HEIGHT + (buttonCount - 1) * BUTTON_GAP;
		const titleAreaHeight = 240;
		const contentBlockHeight = titleAreaHeight + totalButtonsHeight;
		const top = (contentSize.y - contentBlockHeight) * 0.5;

		this.#titleLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, top + titleAreaHeight * 0.5));

		let y = top + titleAreaHeight + BUTTON_HEIGHT * 0.5;
		for (const node of this.#buttonNodes) {
			node.setLocalPosition(Vector2.create(contentSize.x * 0.5, y));
			y += BUTTON_HEIGHT + BUTTON_GAP;
		}
	}

	//==============================================================================
	// 종료.
	//==============================================================================
	handleQuit() {
		// 모바일 환경에서 탭/창 닫기를 시도. (브라우저 정책상 막힐 수 있음)
		if (System.window && typeof System.window.close === "function") {
			System.window.close();
		}
		console.log("[TitlePart] 종료 요청");
	}
}
