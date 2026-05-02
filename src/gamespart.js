//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Part, PartId } from "./part.js";
import { createButtonNode } from "./uihelper.js";


//==============================================================================
// 게임목록 파트.
//==============================================================================
const ITEM_WIDTH = 760;
const ITEM_HEIGHT = 160;
const ITEM_GAP = 32;

export class GamesPart extends Part {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { WorldNode[] } */ #itemNodes;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#itemNodes = [];
	}

	getPartId() {
		return PartId.games;
	}

	getNavigationTitle() {
		return "게임 목록";
	}

	//==============================================================================
	// 빌드.
	//==============================================================================
	onBuild() {
		// 배경.
		const background = this.addComponent(Paint);
		background.setColor(Color.createFromHEX("#2d3148"));

		const app = this.getApp();
		const games = [
			{ text: "지뢰찾기", partId: PartId.minesweeper, color: "#5b8def" },
		];

		for (const game of games) {
			const node = createButtonNode(
				game.text,
				Vector2.create(ITEM_WIDTH, ITEM_HEIGHT),
				Color.createFromHEX(game.color),
				Color.createFromHEX("#ffffff"),
				56,
				() => { app.pushPart(game.partId); },
			);
			this.addChild(node);
			this.#itemNodes.push(node);
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
		const itemCount = this.#itemNodes.length;
		const totalHeight = itemCount * ITEM_HEIGHT + (itemCount - 1) * ITEM_GAP;
		const top = (contentSize.y - totalHeight) * 0.5;
		let y = top + ITEM_HEIGHT * 0.5;
		for (const node of this.#itemNodes) {
			node.setLocalPosition(Vector2.create(contentSize.x * 0.5, y));
			y += ITEM_HEIGHT + ITEM_GAP;
		}
	}
}
