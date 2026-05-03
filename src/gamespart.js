//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { AnchoredWorldNode } from "../libs/vanilla.js/src/core/node/anchoredworldmnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { UIScrollView, ScrollMode } from "../libs/vanilla.js/src/ui/uiscrollview.js";
import { Part, PartId } from "./part.js";
import { getDefaultFontFace } from "./uihelper.js";


//==============================================================================
// 게임목록 파트.
// - viewport (AnchoredWorldNode + UIScrollView) 안에 게임 셀 그리드.
// - UIScrollView 가 마스크/관성/탄성/클램프 처리.
// - 자식 셀이 입력을 가져가므로 셀이 받은 입력을 ScrollView 로 위임한다.
//   (드래그 임계 미만이면 클릭, 초과면 클릭 취소)
//==============================================================================
const COLS = 3;
const TILE_GAP = 16;
const TILE_HEIGHT = 220;
const SIDE_MARGIN = 30;
const TOP_PADDING = 24;
const BOTTOM_PADDING = 24;
const DRAG_THRESHOLD = 10;            // 클릭 vs 드래그 판정 거리(px).


//==============================================================================
// 게임 셀 노드.
//==============================================================================
class GameCell extends WorldNode {
	/** @type { string } */ partId;
	/** @private @type { GamesPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;
	/** @private @type { Color } */ #baseColor;
	/** @private @type { Color } */ #pressedColor;
	/** @private @type { Vector2 | null } */ #pressStart;
	/** @private @type { boolean } */ #wasDragged;

	constructor(part, text, hex, partId) {
		super();
		this.setPivot(Pivot.middleCenter);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.partId = partId;
		this.#part = part;
		this.#baseColor = Color.createFromHEX(hex);
		const k = 0.7;
		this.#pressedColor = new Color(this.#baseColor.red * k, this.#baseColor.green * k, this.#baseColor.blue * k, this.#baseColor.alpha);
		this.#pressStart = null;
		this.#wasDragged = false;

		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#paint.setColor(this.#baseColor);

		this.#label = this.addComponent(Label);
		this.#label.setText(text);
		this.#label.setFontSize(40);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.#label.setTextColor(Color.createFromHEX("#ffffff"));
		const font = getDefaultFontFace();
		if (font) this.#label.setFont(font);
	}

	setPressed(on) {
		this.#paint.setColor(on ? this.#pressedColor : this.#baseColor);
	}

	touchPress(viewInputPosition) {
		if (!this.#part.isInsideViewport(viewInputPosition)) return;
		this.#pressStart = Vector2.create(viewInputPosition.x, viewInputPosition.y);
		this.#wasDragged = false;
		this.setPressed(true);
		this.#part.scrollPress(viewInputPosition);
	}

	touchMove(viewInputPosition) {
		if (!this.#pressStart) return;
		if (!this.#wasDragged) {
			const dx = viewInputPosition.x - this.#pressStart.x;
			const dy = viewInputPosition.y - this.#pressStart.y;
			if (System.Math.abs(dx) > DRAG_THRESHOLD || System.Math.abs(dy) > DRAG_THRESHOLD) {
				this.#wasDragged = true;
				this.setPressed(false);
			}
		}
		this.#part.scrollMove(viewInputPosition);
	}

	touchRelease(viewInputPosition) {
		if (!this.#pressStart) return;
		const wasDragged = this.#wasDragged;
		this.#pressStart = null;
		this.#wasDragged = false;
		this.setPressed(false);
		this.#part.scrollRelease(viewInputPosition);
		if (!wasDragged && this.contains(viewInputPosition) && this.#part.isInsideViewport(viewInputPosition)) {
			this.#part.onCellClick(this.partId);
		}
	}

	touchCancel(viewInputPosition) {
		if (!this.#pressStart) return;
		this.#pressStart = null;
		this.#wasDragged = false;
		this.setPressed(false);
		this.#part.scrollCancel(viewInputPosition);
	}
}


//==============================================================================
// 게임목록 파트.
//==============================================================================
export class GamesPart extends Part {
	/** @private @type { AnchoredWorldNode } */ #viewportNode;
	/** @private @type { UIScrollView } */ #scrollView;
	/** @private @type { GameCell[] } */ #cells;
	/** @private @type { Array<{text: string, partId: string, color: string}> } */ #games;

	constructor() {
		super();
		this.#viewportNode = null;
		this.#scrollView = null;
		this.#cells = [];
		this.#games = [];
	}

	getPartId() { return PartId.games; }
	getNavigationTitle() { return "게임 목록"; }

	onBuild() {
		this.setupBackground();

		this.#games = [
			{ text: "지뢰찾기", partId: PartId.minesweeper, color: "#5b8def" },
			{ text: "틱택토", partId: PartId.ticTacToe, color: "#ef6c6c" },
			{ text: "메모리매치", partId: PartId.memoryMatch, color: "#9c5bef" },
			{ text: "15퍼즐", partId: PartId.puzzle15, color: "#5bef9c" },
			{ text: "두더지잡기", partId: PartId.whackAMole, color: "#ef9c5b" },
			{ text: "숫자맞추기", partId: PartId.numberGuess, color: "#5befef" },
			{ text: "반응속도", partId: PartId.reactionTime, color: "#22c55e" },
			{ text: "사이먼", partId: PartId.simon, color: "#3b82f6" },
			{ text: "가위바위보", partId: PartId.rps, color: "#eab308" },
			{ text: "2048", partId: PartId.game2048, color: "#f59563" },
			{ text: "빠른계산", partId: PartId.quickMath, color: "#a16207" },
			{ text: "순서맞추기", partId: PartId.sequence, color: "#0ea5e9" },
			{ text: "홀짝", partId: PartId.oddEven, color: "#71717a" },
			{ text: "다른색찾기", partId: PartId.findOdd, color: "#ec4899" },
			{ text: "스트룹", partId: PartId.stroop, color: "#a855f7" },
			{ text: "주사위베팅", partId: PartId.diceBet, color: "#84cc16" },
			{ text: "하이로우", partId: PartId.highLow, color: "#14b8a6" },
			{ text: "블랙잭", partId: PartId.blackjack, color: "#1e293b" },
			{ text: "슬롯머신", partId: PartId.slot, color: "#dc2626" },
			{ text: "숫자기억", partId: PartId.numberMemory, color: "#7c3aed" },
			{ text: "카운트스톱", partId: PartId.countStop, color: "#06b6d4" },
			{ text: "표적탭", partId: PartId.targetTap, color: "#f97316" },
			{ text: "컬러카운트", partId: PartId.colorCount, color: "#10b981" },
			{ text: "방향맞추기", partId: PartId.direction, color: "#6366f1" },
			{ text: "공통아이콘", partId: PartId.sameIcon, color: "#d946ef" },
			{ text: "동전베팅", partId: PartId.coinFlip, color: "#ca8a04" },
		];

		// 뷰포트 (AnchoredWorldNode). UIScrollView attach 시 마스크/interactable 자동.
		this.#viewportNode = new AnchoredWorldNode();
		this.#viewportNode.setName("viewport");
		this.#viewportNode.setPivot(Pivot.topLeft);
		this.#viewportNode.setAnchorMin(Vector2.zero());
		this.#viewportNode.setAnchorMax(Vector2.zero());
		this.addChild(this.#viewportNode);

		this.#scrollView = this.#viewportNode.addComponent(UIScrollView);
		this.#scrollView.setHorizontal(false);
		this.#scrollView.setVertical(true);
		this.#scrollView.setScrollMode(ScrollMode.elastic);
		this.#scrollView.setBackgroundColor(Color.transparent());

		// ScrollView 내부 content 노드에 셀들 추가.
		const content = this.#scrollView.getContent();
		for (const game of this.#games) {
			const cell = new GameCell(this, game.text, game.color, game.partId);
			content.addChild(cell);
			this.#cells.push(cell);
		}
	}

	enter() {
		this.layout();
		if (this.#scrollView) {
			this.#scrollView.setScrollOffset(Vector2.zero());
		}
	}

	onResize() {
		this.layout();
	}

	//==============================================================================
	// 레이아웃 - 뷰포트 = 파트 영역, 콘텐츠 = 그리드 전체 높이.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		if (!this.#viewportNode || contentSize.x <= 0) return;

		// 뷰포트.
		this.#viewportNode.setLocalPosition(Vector2.zero());
		this.#viewportNode.setContentSize(contentSize);

		// 셀 크기 산정.
		const availW = contentSize.x - SIDE_MARGIN * 2;
		const tileW = System.Math.floor((availW - TILE_GAP * (COLS - 1)) / COLS);
		const itemCount = this.#cells.length;
		const rows = System.Math.ceil(itemCount / COLS);
		const totalContentH = TOP_PADDING + TILE_HEIGHT * rows + TILE_GAP * (rows - 1) + BOTTOM_PADDING;

		// 스크롤 콘텐츠 크기. (가로는 뷰포트, 세로는 그리드 전체 높이)
		this.#scrollView.setScrollContentSize(Vector2.create(contentSize.x, totalContentH));

		// 셀 위치. (content 좌상단 기준, 셀은 middleCenter 피봇)
		const startX = SIDE_MARGIN + tileW * 0.5;
		const startY = TOP_PADDING + TILE_HEIGHT * 0.5;
		for (let i = 0; i < itemCount; ++i) {
			const r = System.Math.floor(i / COLS);
			const c = i % COLS;
			const cell = this.#cells[i];
			cell.setContentSize(Vector2.create(tileW, TILE_HEIGHT));
			cell.setLocalPosition(Vector2.create(startX + c * (tileW + TILE_GAP), startY + r * (TILE_HEIGHT + TILE_GAP)));
		}
	}

	//==============================================================================
	// 뷰포트(마스크) 안 글로벌 좌표 검사.
	//==============================================================================
	isInsideViewport(viewInputPosition) {
		if (!this.#viewportNode) return false;
		return this.#viewportNode.contains(viewInputPosition);
	}

	//==============================================================================
	// 셀에서 받은 입력을 ScrollView 로 위임.
	//==============================================================================
	scrollPress(pos) {
		if (this.#scrollView) this.#scrollView.touchPress(pos);
	}
	scrollMove(pos) {
		if (this.#scrollView) this.#scrollView.touchMove(pos);
	}
	scrollRelease(pos) {
		if (this.#scrollView) this.#scrollView.touchRelease(pos);
	}
	scrollCancel(pos) {
		if (this.#scrollView) this.#scrollView.touchCancel(pos);
	}

	//==============================================================================
	// 셀 클릭 → 파트 진입.
	//==============================================================================
	onCellClick(partId) {
		const app = this.getApp();
		app.pushPart(partId);
	}
}
