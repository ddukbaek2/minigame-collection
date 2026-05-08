//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Text } from "../libs/vanilla.js/src/core/component/text.js";
import { UIScrollView, ScrollMode } from "../libs/vanilla.js/src/ui/uiscrollview.js";
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { Part, PartId } from "./part.js";
import { getDefaultFontFace } from "./uihelper.js";
import { getTotalScore, getPlayCount, addScoreChangeListener } from "./scoreboard.js";
import { getVisibleGames } from "./gamescatalog.js";


//==============================================================================
// 게임목록 파트.
// - viewport (WorldNode + UIScrollView) 안에 게임 셀 그리드.
// - TouchRecognizer 가 자식 셀 위에서의 드래그를 자동으로 ScrollView 로
//   위임하므로, 셀은 평범한 버튼처럼 touchPress/Release 만 처리하면 된다.
//==============================================================================
const COLS = 3;
const TILE_GAP = 16;
const TILE_HEIGHT = 220;
const SIDE_MARGIN = 30;
const TOP_PADDING = 24;
const BOTTOM_PADDING = 24;
const NUMBER_FONT_SIZE = 24;
const NUMBER_PADDING = 14;
const BADGE_HORIZONTAL_PADDING = 14;
const BADGE_BOTTOM_PADDING = 12;
const BADGE_GAP = 4;
const BADGE_ROUND_SIZE = 10;
const SCORE_BADGE_HEIGHT = 32;
const SCORE_BADGE_FONT_SIZE = 20;
const PLAY_COUNT_BADGE_HEIGHT = 26;
const PLAY_COUNT_BADGE_FONT_SIZE = 16;


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
	/** @type { string | null } */ gameId;
	/** @private @type { GamesPart } */ #gamesPart;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;
	/** @private @type { UIButton } */ #button;
	/** @private @type { WorldNode } */ #numberNode;
	/** @private @type { WorldNode } */ #scoreNode;
	/** @private @type { Paint } */ #scorePaint;
	/** @private @type { Text } */ #scoreText;
	/** @private @type { WorldNode } */ #playCountNode;
	/** @private @type { Paint } */ #playCountPaint;
	/** @private @type { Text } */ #playCountText;

	constructor(gamesPart, text, hex, targetPartId, gameId, index) {
		super();
		this.setPivot(Pivot.middleCenter);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.targetPartId = targetPartId;
		this.gameId = gameId || null;
		this.#gamesPart = gamesPart;

		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(16);
		this.#paint.setColor(Color.createFromHEX(hex));

		this.#text = this.addComponent(Text);
		this.#text.setText(text);
		this.#text.setFontSize(40);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.#text.setTextColor(Color.createFromHEX("#ffffff"));
		const font = getDefaultFontFace();
		if (font) this.#text.setFont(font);

		// 우측상단 번호 라벨. ("#1" "#2" ...) - setContentSize 에서 위치를 재계산.
		this.#numberNode = new WorldNode();
		this.#numberNode.setPivot(Pivot.topLeft);
		this.#numberNode.setAnchor(Pivot.topLeft);
		const numberText = this.#numberNode.addComponent(Text);
		numberText.setText(`#${index}`);
		numberText.setFontSize(NUMBER_FONT_SIZE);
		numberText.setTextAlign("right");
		numberText.setTextBaseline("top");
		numberText.setTextColor(new Color(255, 255, 255, 0.7));
		if (font) numberText.setFont(font);
		this.addChild(this.#numberNode);

		// 하단 총점 배지. (라운드렉트 배경 + 텍스트)
		this.#scoreNode = new WorldNode();
		this.#scoreNode.setPivot(Pivot.topLeft);
		this.#scoreNode.setAnchor(Pivot.topLeft);
		this.#scorePaint = this.#scoreNode.addComponent(Paint);
		this.#scorePaint.setRoundSize(BADGE_ROUND_SIZE);
		this.#scorePaint.setColor(new Color(0, 0, 0, 0.32));
		this.#scoreText = this.#scoreNode.addComponent(Text);
		this.#scoreText.setFontSize(SCORE_BADGE_FONT_SIZE);
		this.#scoreText.setTextAlign("center");
		this.#scoreText.setTextBaseline("middle");
		this.#scoreText.setTextColor(new Color(255, 255, 255, 0.95));
		if (font) this.#scoreText.setFont(font);
		this.addChild(this.#scoreNode);

		// 하단 플레이 횟수 배지. (점수 배지 위에 별도로 표시)
		this.#playCountNode = new WorldNode();
		this.#playCountNode.setPivot(Pivot.topLeft);
		this.#playCountNode.setAnchor(Pivot.topLeft);
		this.#playCountPaint = this.#playCountNode.addComponent(Paint);
		this.#playCountPaint.setRoundSize(BADGE_ROUND_SIZE);
		this.#playCountPaint.setColor(new Color(0, 0, 0, 0.22));
		this.#playCountText = this.#playCountNode.addComponent(Text);
		this.#playCountText.setFontSize(PLAY_COUNT_BADGE_FONT_SIZE);
		this.#playCountText.setTextAlign("center");
		this.#playCountText.setTextBaseline("middle");
		this.#playCountText.setTextColor(new Color(255, 255, 255, 0.75));
		if (font) this.#playCountText.setFont(font);
		this.addChild(this.#playCountNode);

		this.refreshScore();

		this.#button = this.addComponent(UIButton);
		this.#button.excludeComponentFromTint(this.#text);
		// 번호 / 총점 / 플레이 횟수 모두 트랜지션 대상에서 제외.
		this.#button.excludeNodeFromTint(this.#numberNode);
		this.#button.excludeNodeFromTint(this.#scoreNode);
		this.#button.excludeNodeFromTint(this.#playCountNode);
		this.#button.setClickedEvent(() => this.#gamesPart.onItemSelected(this.targetPartId));
	}

	//==============================================================================
	// 배지 텍스트 / 가시성 갱신. 각 배지는 독립적으로 표시 여부 결정.
	//==============================================================================
	refreshScore() {
		const total = this.gameId ? getTotalScore(this.gameId) : 0;
		const playCount = this.gameId ? getPlayCount(this.gameId) : 0;

		const scoreVisible = total > 0;
		this.#scoreNode.setActive(scoreVisible);
		if (scoreVisible) {
			this.#scoreText.setText(`${total.toLocaleString()}점`);
		}

		const playCountVisible = playCount > 0;
		this.#playCountNode.setActive(playCountVisible);
		if (playCountVisible) {
			this.#playCountText.setText(`${playCount.toLocaleString()}회`);
		}
	}

	//==============================================================================
	// 콘텐트 크기 변경 시 자식 노드들 위치/크기 재계산.
	// - 플레이 횟수 배지가 가장 아래, 그 위에 총점 배지가 GAP 만큼 띄워서 자리잡음.
	//==============================================================================
	setContentSize(size) {
		super.setContentSize(size);
		if (this.#numberNode) {
			this.#numberNode.setLocalPosition(Vector2.create(size.x - NUMBER_PADDING, NUMBER_PADDING));
		}
		const badgeWidth = System.Math.max(0, size.x - BADGE_HORIZONTAL_PADDING * 2);
		const playCountTop = size.y - BADGE_BOTTOM_PADDING - PLAY_COUNT_BADGE_HEIGHT;
		const scoreTop = playCountTop - BADGE_GAP - SCORE_BADGE_HEIGHT;

		if (this.#scoreNode) {
			this.#scoreNode.setLocalPosition(Vector2.create(BADGE_HORIZONTAL_PADDING, scoreTop));
			this.#scoreNode.setContentSize(Vector2.create(badgeWidth, SCORE_BADGE_HEIGHT));
		}
		if (this.#playCountNode) {
			this.#playCountNode.setLocalPosition(Vector2.create(BADGE_HORIZONTAL_PADDING, playCountTop));
			this.#playCountNode.setContentSize(Vector2.create(badgeWidth, PLAY_COUNT_BADGE_HEIGHT));
		}
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
	/** @private @type { WorldNode } */ #scrollViewportNode;
	/** @private @type { UIScrollView } */ #scrollView;
	/** @private @type { UIGamesPartScrollViewItem[] } */ #scrollViewItems;
	/** @private @type { Array<{id: string, partId: string, title: string, color: string, visible?: boolean}> } */ #games;

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

		// 카탈로그(assets/data/games.json) 에서 노출 대상만 가져온다. 카탈로그는 main.load
		// 단계에서 미리 fetch 되므로 onBuild 시점엔 동기로 접근 가능.
		this.#games = getVisibleGames();

		// 스크롤 뷰포트. UIScrollView 의 require(Mask) 가 자동으로 클리핑을 켜준다.
		this.#scrollViewportNode = new WorldNode();
		this.#scrollViewportNode.setName("scrollViewport");
		this.#scrollViewportNode.setPivot(Pivot.topLeft);
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
		let itemIndex = 1;
		for (const game of this.#games) {
			const item = new UIGamesPartScrollViewItem(this, game.title, game.color, game.partId, game.id, itemIndex);
			scrollContent.addChild(item);
			this.#scrollViewItems.push(item);
			++itemIndex;
		}

		// 스코어 변경 시 해당 GameId 의 항목만 refresh.
		addScoreChangeListener((gameId) => {
			for (const item of this.#scrollViewItems) {
				if (item.gameId === gameId) {
					item.refreshScore();
				}
			}
		});
	}

	enter() {
		this.layout();
		if (this.#scrollView) {
			this.#scrollView.setScrollOffset(Vector2.zero());
		}
		// 다른 파트에서 돌아왔을 수 있으므로 모든 항목의 총점을 재조회.
		for (const item of this.#scrollViewItems) {
			item.refreshScore();
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
