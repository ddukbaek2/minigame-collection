//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { Part, PartId } from "./part.js";
import { createButtonNode, createLabelNode, markUseSystemFont } from "./uihelper.js";


//==============================================================================
// 타이틀 파트.
// - 메인 메뉴.
// - 타이틀 영역(상단 고정 높이) + 버튼 영역(나머지 컨텐트). 두 영역은 독립적으로 가운데 정렬된다.
//==============================================================================
const TITLE_FONT_SIZE = 130;
const TITLE_AREA_HEIGHT = 400;
const TITLE_BOTTOM_PADDING = 24;
const BUTTON_WIDTH = 560;
const BUTTON_HEIGHT = 110;
const BUTTON_FONT_SIZE = 44;
const BUTTON_GAP = 24;

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

		// 게임 이름. (영역 하단 정렬)
		this.#titleLabelNode = createLabelNode("미니게임 컬렉션", TITLE_FONT_SIZE, Color.createFromHEX("#ffe9a8"));
		const titleLabel = this.#titleLabelNode.getComponent(Label);
		titleLabel.setTextBaseline("bottom");
		this.addChild(this.#titleLabelNode);

		// 메뉴 버튼들. (시작, 일일미션, 업적, 설정, 종료 순)
		// - 텍스트에 이모지 prefix 가 있는 항목은 시스템 폰트(이모지 fallback)로 렌더.
		const app = this.getApp();
		const menuItems = [
			{ text: "▶️ 시작", color: "#5b8def", onClick: () => { app.pushPart(PartId.games); } },
			{ text: "📅 일일미션", color: "#4caf82", onClick: () => { app.pushPart(PartId.dailyMission); } },
			{ text: "🏆 업적", color: "#c98a3f", onClick: () => { app.pushPart(PartId.achievement); } },
			{ text: "⚙️ 설정", color: "#7a7e96", onClick: () => { app.pushPart(PartId.configuration); } },
			{ text: "🚪 종료", color: "#a04545", onClick: () => { this.handleQuit(); } },
		];

		for (const item of menuItems) {
			const node = createButtonNode(
				item.text,
				Vector2.create(BUTTON_WIDTH, BUTTON_HEIGHT),
				Color.createFromHEX(item.color),
				Color.createFromHEX("#ffffff"),
				BUTTON_FONT_SIZE,
				item.onClick,
			);
			// 라벨에 이모지가 들어 있으므로 시스템 폰트로 렌더링.
			const buttonLabel = node.getComponent(Label);
			markUseSystemFont(buttonLabel);
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

		// 타이틀: 상단 0 ~ TITLE_AREA_HEIGHT 영역의 하단 정렬. (세로가 늘어나도 상단 고정)
		this.#titleLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, TITLE_AREA_HEIGHT - TITLE_BOTTOM_PADDING));

		// 버튼: 타이틀 아래 나머지 영역의 가운데. (세로가 늘어나면 그 가운데로 따라감)
		const buttonAreaTop = TITLE_AREA_HEIGHT;
		const buttonAreaHeight = contentSize.y - buttonAreaTop;
		const buttonCount = this.#buttonNodes.length;
		const totalButtonsHeight = buttonCount * BUTTON_HEIGHT + (buttonCount - 1) * BUTTON_GAP;
		const buttonsTop = buttonAreaTop + (buttonAreaHeight - totalButtonsHeight) * 0.5;

		let y = buttonsTop + BUTTON_HEIGHT * 0.5;
		for (const node of this.#buttonNodes) {
			node.setLocalPosition(Vector2.create(contentSize.x * 0.5, y));
			y += BUTTON_HEIGHT + BUTTON_GAP;
		}
	}

	//==============================================================================
	// 종료. (확인 팝업 후 종료)
	//==============================================================================
	handleQuit() {
		const app = this.getApp();
		app.showConfirm("정말 종료하시겠습니까?", () => {
			// 모바일 환경에서 탭/창 닫기를 시도. (브라우저 정책상 막힐 수 있음)
			if (System.window && typeof System.window.close === "function") {
				System.window.close();
			}
			console.log("[TitlePart] 종료 확정");
		});
	}
}
