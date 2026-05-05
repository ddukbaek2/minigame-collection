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
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { Part, PartId } from "./part.js";
import { getDefaultFontFace } from "./uihelper.js";


//==============================================================================
// 게임목록 파트.
// - viewport (AnchoredWorldNode + UIScrollView) 안에 게임 셀 그리드.
// - TouchRecognizer 가 자식 셀 위에서의 드래그를 자동으로 ScrollView 로
//   위임하므로, 셀은 평범한 버튼처럼 touchPress/Release 만 처리하면 된다.
//==============================================================================
const COLS = 3;
const TILE_GAP = 16;
const TILE_HEIGHT = 220;
const SIDE_MARGIN = 30;
const TOP_PADDING = 24;
const BOTTOM_PADDING = 24;


//==============================================================================
// 게임 목록 스크롤뷰 안에 들어가는 단일 항목.
// - UIButton 컴포넌트가 press / release / click 상태머신과 컬러 트랜지션을 담당.
//   배경 Paint 가 transitionDuration 에 걸쳐 자동으로 darken 된다 (default
//   pressedTintColor=(0,0,0,0.3) → 70% darken, 기존 k=0.7 와 동일).
// - 라벨 텍스트는 트랜지션 대상에서 제외해 색이 흐려지지 않도록 한다.
// - 드래그 → 스크롤 인계는 TouchRecognizer 가 처리한다.
// - 마스크(스크롤 뷰포트) 밖 좌표는 press/release 를 컴포넌트에 전달하지 않아
//   부분적으로 잘린 항목이 클릭되는 것을 막는다.
//==============================================================================
class UIGamesPartScrollViewItem extends WorldNode {
	/** @type { string } */ targetPartId;
	/** @private @type { GamesPart } */ #gamesPart;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;
	/** @private @type { UIButton } */ #button;

	constructor(gamesPart, text, hex, targetPartId) {
		super();
		this.setPivot(Pivot.middleCenter);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.targetPartId = targetPartId;
		this.#gamesPart = gamesPart;

		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#paint.setColor(Color.createFromHEX(hex));

		this.#label = this.addComponent(Label);
		this.#label.setText(text);
		this.#label.setFontSize(40);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.#label.setTextColor(Color.createFromHEX("#ffffff"));
		const font = getDefaultFontFace();
		if (font) this.#label.setFont(font);

		this.#button = this.addComponent(UIButton);
		this.#button.excludeComponentFromTint(this.#label);
		this.#button.setClickedEvent(() => this.#gamesPart.onItemSelected(this.targetPartId));
	}

	touchPress(viewInputPosition) {
		if (!this.#gamesPart.isInsideViewport(viewInputPosition)) return;
		super.touchPress(viewInputPosition);
	}

	touchRelease(viewInputPosition) {
		// 뷰포트 밖에서 떨어지면 클릭이 발동되지 않도록 cancel 로 변환해 전달.
		if (this.#gamesPart.isInsideViewport(viewInputPosition)) {
			super.touchRelease(viewInputPosition);
		}
		else {
			super.touchCancel(viewInputPosition);
		}
	}
}


//==============================================================================
// 게임목록 파트.
//==============================================================================
export class GamesPart extends Part {
	/** @private @type { AnchoredWorldNode } */ #scrollViewportNode;
	/** @private @type { UIScrollView } */ #scrollView;
	/** @private @type { UIGamesPartScrollViewItem[] } */ #scrollViewItems;
	/** @private @type { Array<{text: string, partId: string, color: string}> } */ #games;

	constructor() {
		super();
		this.#scrollViewportNode = null;
		this.#scrollView = null;
		this.#scrollViewItems = [];
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

		// 스크롤 뷰포트.
		// - UIScrollView 가 (현재 과도기 라이브러리 한정으로) AnchoredWorldNode 인스턴스에만
		//   attach 시 마스크/interactable 자동 처리를 해주므로 이 노드만 어쩔 수 없이
		//   AnchoredWorldNode 로 둔다. 다른 노드는 모두 일반 WorldNode 사용.
		this.#scrollViewportNode = new AnchoredWorldNode();
		this.#scrollViewportNode.setName("scrollViewport");
		this.#scrollViewportNode.setPivot(Pivot.topLeft);
		this.#scrollViewportNode.setAnchorMin(Vector2.zero());
		this.#scrollViewportNode.setAnchorMax(Vector2.zero());
		this.addChild(this.#scrollViewportNode);

		this.#scrollView = this.#scrollViewportNode.addComponent(UIScrollView);
		this.#scrollView.setHorizontal(false);
		this.#scrollView.setVertical(true);
		this.#scrollView.setScrollMode(ScrollMode.elastic);
		this.#scrollView.setBackgroundColor(Color.transparent());
		// 세로 스크롤바 자동 생성 / 관리.
		this.#scrollView.setShowsVerticalScrollBar(true);

		// 스크롤뷰 내부 content 노드에 항목들 추가.
		const scrollContent = this.#scrollView.getContent();
		for (const game of this.#games) {
			const item = new UIGamesPartScrollViewItem(this, game.text, game.color, game.partId);
			scrollContent.addChild(item);
			this.#scrollViewItems.push(item);
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
		if (!this.#scrollViewportNode || contentSize.x <= 0) return;

		this.#scrollViewportNode.setLocalPosition(Vector2.zero());
		this.#scrollViewportNode.setContentSize(contentSize);

		// 가시 영역 = 뷰포트 - 스크롤바 점유 영역.
		const innerSize = this.#scrollView.getInnerContentSize();
		const innerWidth = innerSize.x;

		const availW = innerWidth - SIDE_MARGIN * 2;
		const tileW = System.Math.floor((availW - TILE_GAP * (COLS - 1)) / COLS);
		const itemCount = this.#scrollViewItems.length;
		const rows = System.Math.ceil(itemCount / COLS);
		const totalContentH = TOP_PADDING + TILE_HEIGHT * rows + TILE_GAP * (rows - 1) + BOTTOM_PADDING;

		this.#scrollView.setScrollContentSize(Vector2.create(innerWidth, totalContentH));

		const startX = SIDE_MARGIN + tileW * 0.5;
		const startY = TOP_PADDING + TILE_HEIGHT * 0.5;
		for (let i = 0; i < itemCount; ++i) {
			const r = System.Math.floor(i / COLS);
			const c = i % COLS;
			const item = this.#scrollViewItems[i];
			item.setContentSize(Vector2.create(tileW, TILE_HEIGHT));
			item.setLocalPosition(Vector2.create(startX + c * (tileW + TILE_GAP), startY + r * (TILE_HEIGHT + TILE_GAP)));
		}
	}

	//==============================================================================
	// 스크롤 뷰포트(마스크) 안 글로벌 좌표 검사. (스크롤로 잘린 항목 클릭 방지)
	//==============================================================================
	isInsideViewport(viewInputPosition) {
		if (!this.#scrollViewportNode) return false;
		return this.#scrollViewportNode.contains(viewInputPosition);
	}

	//==============================================================================
	// 항목 선택 → 해당 파트로 진입.
	//==============================================================================
	onItemSelected(targetPartId) {
		const app = this.getApp();
		app.pushPart(targetPartId);
	}
}
