//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { UIScrollView, ScrollMode } from "../libs/vanilla.js/src/ui/uiscrollview.js";
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { addThemeChangeListener, getCurrentTheme } from "./theme.js";
import { getDefaultFontFace, markUseSystemFont } from "./uihelper.js";
import { getNotices } from "./notice.js";


//==============================================================================
// 박스 / 카드 / 트윈 상수.
//==============================================================================
const BOX_WIDTH_RATIO = 0.92;
const BOX_HEIGHT_RATIO = 0.78;
const BOX_ROUND_SIZE = 28;
const HEADER_HEIGHT = 96;
const HEADER_PADDING = 24;
const TITLE_FONT_SIZE = 44;
const CLOSE_BUTTON_SIZE = 64;
const CLOSE_BUTTON_FONT_SIZE = 36;
const SCROLL_HORIZONTAL_PADDING = 20;
const SCROLL_VERTICAL_PADDING = 16;
const CARD_GAP = 14;
const CARD_INNER_PADDING_X = 20;
const CARD_INNER_PADDING_TOP = 16;
const CARD_INNER_PADDING_BOTTOM = 18;
const CARD_HEADER_HEIGHT = 32;
const CARD_HEADER_TO_CONTENT_GAP = 12;
const CARD_ROUND_SIZE = 14;
const DATE_FONT_SIZE = 24;
const VERSION_FONT_SIZE = 22;
// 헤더 좌측에 버전 → 우측에 날짜. 버전 블록 폭 (대략 "v999.99.99" 까지 들어감).
const VERSION_BLOCK_WIDTH = 130;
const CONTENT_FONT_SIZE = 28;
const CONTENT_LINE_HEIGHT = 36;
// 트윈 (지수 감쇠 lerp).
const TWEEN_RATE = 22;
const TWEEN_OFFSET_Y = 50;
const TWEEN_SNAP_EPSILON = 0.005;


//==============================================================================
// 한 공지 항목 카드. 본문 줄 수에 따라 가변 높이.
//==============================================================================
class NoticeCard extends WorldNode {
	/** @private @type { Paint } */ #paint;
	/** @private @type { WorldNode } */ #dateNode;
	/** @private @type { Label } */ #dateLabel;
	/** @private @type { WorldNode | null } */ #versionNode;
	/** @private @type { Label | null } */ #versionLabel;
	/** @private @type { WorldNode[] } */ #contentLineNodes;
	/** @private @type { Label[] } */ #contentLineLabels;

	constructor(date, version, content) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);

		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(CARD_ROUND_SIZE);

		const font = getDefaultFontFace();

		// 헤더: 좌측 날짜 + 우측 버전.
		this.#dateNode = new WorldNode();
		this.#dateNode.setPivot(Pivot.topLeft);
		this.#dateNode.setAnchor(Pivot.topLeft);
		this.#dateLabel = this.#dateNode.addComponent(Label);
		this.#dateLabel.setText(date);
		this.#dateLabel.setFontSize(DATE_FONT_SIZE);
		this.#dateLabel.setTextAlign("left");
		this.#dateLabel.setTextBaseline("top");
		if (font) this.#dateLabel.setFont(font);
		this.addChild(this.#dateNode);

		this.#versionNode = null;
		this.#versionLabel = null;
		if (typeof version === "string" && version.length > 0) {
			this.#versionNode = new WorldNode();
			this.#versionNode.setPivot(Pivot.topLeft);
			this.#versionNode.setAnchor(Pivot.topLeft);
			this.#versionLabel = this.#versionNode.addComponent(Label);
			this.#versionLabel.setText(`v${version}`);
			this.#versionLabel.setFontSize(VERSION_FONT_SIZE);
			this.#versionLabel.setTextAlign("left");
			this.#versionLabel.setTextBaseline("top");
			if (font) this.#versionLabel.setFont(font);
			this.addChild(this.#versionNode);
		}

		// 본문: "\n" 단위로 줄별 라벨 생성.
		const lines = String(content || "").split("\n");
		this.#contentLineNodes = [];
		this.#contentLineLabels = [];
		for (const line of lines) {
			const lineNode = new WorldNode();
			lineNode.setPivot(Pivot.topLeft);
			lineNode.setAnchor(Pivot.topLeft);
			const lineLabel = lineNode.addComponent(Label);
			lineLabel.setText(line);
			lineLabel.setFontSize(CONTENT_FONT_SIZE);
			lineLabel.setTextAlign("left");
			lineLabel.setTextBaseline("top");
			if (font) lineLabel.setFont(font);
			this.addChild(lineNode);
			this.#contentLineNodes.push(lineNode);
			this.#contentLineLabels.push(lineLabel);
		}
	}

	getDesiredHeight() {
		const lineCount = this.#contentLineNodes.length;
		return CARD_INNER_PADDING_TOP
			+ CARD_HEADER_HEIGHT
			+ CARD_HEADER_TO_CONTENT_GAP
			+ lineCount * CONTENT_LINE_HEIGHT
			+ CARD_INNER_PADDING_BOTTOM;
	}

	applyTheme(theme) {
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
		this.#dateLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		if (this.#versionLabel) {
			this.#versionLabel.setTextColor(Color.createFromHEX(theme.primary));
		}
		const contentColor = Color.createFromHEX(theme.onSurface);
		for (const label of this.#contentLineLabels) {
			label.setTextColor(contentColor);
		}
	}

	setContentSize(size) {
		super.setContentSize(size);

		// 헤더: 좌측에 버전, 그 우측에 날짜.
		const headerX = CARD_INNER_PADDING_X;
		const headerY = CARD_INNER_PADDING_TOP;
		if (this.#versionNode) {
			this.#versionNode.setLocalPosition(Vector2.create(headerX, headerY));
		}
		const dateX = this.#versionNode ? headerX + VERSION_BLOCK_WIDTH : headerX;
		this.#dateNode.setLocalPosition(Vector2.create(dateX, headerY));

		// 본문 라인을 헤더 아래에 세로로 적층.
		const contentTop = CARD_INNER_PADDING_TOP + CARD_HEADER_HEIGHT + CARD_HEADER_TO_CONTENT_GAP;
		for (let i = 0; i < this.#contentLineNodes.length; ++i) {
			const lineNode = this.#contentLineNodes[i];
			lineNode.setLocalPosition(Vector2.create(CARD_INNER_PADDING_X, contentTop + i * CONTENT_LINE_HEIGHT));
		}
	}
}


//==============================================================================
// 공지 팝업.
// - dim + 박스 (헤더 + 스크롤뷰). 카드들을 최신순으로 나열.
// - 켜질 때: dim 페이드인 + 박스가 살짝 아래에서 위로 슬라이드.
// - 닫을 때: 역방향으로 트윈한 뒤 setActive(false).
// - dim 영역 탭 또는 X 버튼 클릭으로 닫는다.
//==============================================================================
export class NoticePopup extends WorldNode {
	/** @private @type { Paint } */ #dimPaint;
	/** @private @type { number } */ #baseDimAlpha;
	/** @private @type { WorldNode } */ #boxNode;
	/** @private @type { Paint } */ #boxPaint;
	/** @private @type { WorldNode } */ #titleNode;
	/** @private @type { Label } */ #titleLabel;
	/** @private @type { WorldNode } */ #closeButtonNode;
	/** @private @type { Paint } */ #closeButtonPaint;
	/** @private @type { Label } */ #closeButtonLabel;
	/** @private @type { WorldNode } */ #scrollContainerNode;
	/** @private @type { UIScrollView } */ #scrollView;
	/** @private @type { NoticeCard[] } */ #cards;
	/** @private @type { Vector2 } */ #boxBasePos;
	/** @private @type { number } */ #animProgress;
	/** @private @type { number } */ #animTarget;

	constructor() {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setActive(false);
		this.setInteractable(true);

		this.#cards = [];
		this.#boxBasePos = Vector2.zero();
		this.#animProgress = 0;
		this.#animTarget = 0;
		this.#baseDimAlpha = 0.55;

		// dim.
		this.#dimPaint = this.addComponent(Paint);
		this.#dimPaint.setColor(new Color(0, 0, 0, this.#baseDimAlpha));

		// 박스.
		this.#boxNode = new WorldNode();
		this.#boxNode.setPivot(Pivot.middleCenter);
		this.#boxNode.setAnchor(Pivot.topLeft);
		this.#boxPaint = this.#boxNode.addComponent(Paint);
		this.#boxPaint.setRoundSize(BOX_ROUND_SIZE);
		this.addChild(this.#boxNode);

		const font = getDefaultFontFace();

		// 헤더 타이틀.
		this.#titleNode = new WorldNode();
		this.#titleNode.setPivot(Pivot.topLeft);
		this.#titleNode.setAnchor(Pivot.topLeft);
		this.#titleLabel = this.#titleNode.addComponent(Label);
		this.#titleLabel.setText("공지 및 업데이트");
		this.#titleLabel.setFontSize(TITLE_FONT_SIZE);
		this.#titleLabel.setTextAlign("left");
		this.#titleLabel.setTextBaseline("middle");
		if (font) this.#titleLabel.setFont(font);
		this.#boxNode.addChild(this.#titleNode);

		// 닫기 버튼 (X).
		this.#closeButtonNode = new WorldNode();
		this.#closeButtonNode.setPivot(Pivot.topLeft);
		this.#closeButtonNode.setAnchor(Pivot.topLeft);
		this.#closeButtonNode.setContentSize(Vector2.create(CLOSE_BUTTON_SIZE, CLOSE_BUTTON_SIZE));
		this.#closeButtonNode.setInteractable(true);
		this.#closeButtonPaint = this.#closeButtonNode.addComponent(Paint);
		this.#closeButtonPaint.setRoundSize(CLOSE_BUTTON_SIZE * 0.5);
		this.#closeButtonLabel = this.#closeButtonNode.addComponent(Label);
		this.#closeButtonLabel.setText("✕");
		this.#closeButtonLabel.setFontSize(CLOSE_BUTTON_FONT_SIZE);
		this.#closeButtonLabel.setTextAlign("center");
		this.#closeButtonLabel.setTextBaseline("middle");
		markUseSystemFont(this.#closeButtonLabel);
		const closeButton = this.#closeButtonNode.addComponent(UIButton);
		closeButton.setClickEvent(() => this.hide());
		this.#boxNode.addChild(this.#closeButtonNode);

		// 스크롤 영역. UIScrollView 의 require(Mask) 가 자동으로 클리핑을 켜준다.
		this.#scrollContainerNode = new WorldNode();
		this.#scrollContainerNode.setName("noticeScroll");
		this.#scrollContainerNode.setPivot(Pivot.topLeft);
		this.#boxNode.addChild(this.#scrollContainerNode);

		this.#scrollView = this.#scrollContainerNode.addComponent(UIScrollView);
		this.#scrollView.setHorizontal(false);
		this.#scrollView.setVertical(true);
		this.#scrollView.setScrollMode(ScrollMode.elastic);
		this.#scrollView.setBackgroundColor(Color.transparent());
		this.#scrollView.setShowsVerticalScrollBar(true);

		// JSON 카탈로그(이미 main.load 에서 fetch 완료) 의 항목들을 카드로 추가.
		const scrollContent = this.#scrollView.getContent();
		const notices = getNotices();
		for (const entry of notices) {
			const card = new NoticeCard(entry.date, entry.version, entry.content);
			scrollContent.addChild(card);
			this.#cards.push(card);
		}

		addThemeChangeListener((theme) => this.applyTheme(theme));
		this.applyTheme(getCurrentTheme());
	}

	//==============================================================================
	// 노출 / 숨김.
	//==============================================================================
	show() {
		this.setActive(true);
		this.#animTarget = 1;
		this.layout();
		// 스크롤 위치 초기화.
		if (this.#scrollView) this.#scrollView.setScrollOffset(Vector2.zero());
		this.applyAnimation();
	}

	hide() {
		this.#animTarget = 0;
	}

	isShowing() {
		return this.isActive() && this.#animTarget === 1;
	}

	//==============================================================================
	// 테마.
	//==============================================================================
	applyTheme(theme) {
		this.#dimPaint.setColor(new Color(0, 0, 0, this.#baseDimAlpha * this.#animProgress));
		this.#boxPaint.setColor(Color.createFromHEX(theme.surface));
		this.#titleLabel.setTextColor(Color.createFromHEX(theme.onSurface));
		this.#closeButtonPaint.setColor(Color.createFromHEX(theme.surfaceVariant));
		this.#closeButtonLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		for (const card of this.#cards) {
			card.applyTheme(theme);
		}
	}

	//==============================================================================
	// 매 프레임: 트윈 진행 + 닫기 시 setActive(false) 처리.
	//==============================================================================
	tick(timeDelta) {
		super.tick(timeDelta);
		if (this.#animProgress === this.#animTarget) return;

		const factor = 1 - System.Math.exp(-TWEEN_RATE * timeDelta);
		this.#animProgress += (this.#animTarget - this.#animProgress) * factor;

		if (this.#animTarget === 0 && this.#animProgress < TWEEN_SNAP_EPSILON) {
			this.#animProgress = 0;
			this.applyAnimation();
			this.setActive(false);
			return;
		}
		if (this.#animTarget === 1 && this.#animProgress > 1 - TWEEN_SNAP_EPSILON) {
			this.#animProgress = 1;
		}
		this.applyAnimation();
	}

	//==============================================================================
	// 트윈 진행도를 시각에 반영. dim 알파 + 박스 슬라이드 오프셋.
	//==============================================================================
	applyAnimation() {
		const p = this.#animProgress;
		// ease-out (1 - (1-p)^2) 로 살짝 부드럽게.
		const eased = 1 - (1 - p) * (1 - p);
		this.#dimPaint.setColor(new Color(0, 0, 0, this.#baseDimAlpha * eased));
		const offsetY = (1 - eased) * TWEEN_OFFSET_Y;
		this.#boxNode.setLocalPosition(Vector2.create(this.#boxBasePos.x, this.#boxBasePos.y + offsetY));
	}

	//==============================================================================
	// 레이아웃. 박스 / 헤더 / 스크롤 영역 / 각 카드의 가변 높이 적용.
	//==============================================================================
	layout() {
		const contentSize = this.getContentSize();
		if (contentSize.x <= 0 || contentSize.y <= 0) return;

		// 박스 사이즈/중심 계산.
		const boxWidth = System.Math.floor(contentSize.x * BOX_WIDTH_RATIO);
		const boxHeight = System.Math.floor(contentSize.y * BOX_HEIGHT_RATIO);
		this.#boxNode.setContentSize(Vector2.create(boxWidth, boxHeight));
		this.#boxBasePos = Vector2.create(contentSize.x * 0.5, contentSize.y * 0.5);

		// 헤더 타이틀: 좌측 정렬, 헤더 영역의 세로 가운데.
		this.#titleNode.setLocalPosition(Vector2.create(HEADER_PADDING, HEADER_HEIGHT * 0.5));

		// 닫기 버튼: 우상단.
		this.#closeButtonNode.setLocalPosition(Vector2.create(
			boxWidth - HEADER_PADDING - CLOSE_BUTTON_SIZE,
			(HEADER_HEIGHT - CLOSE_BUTTON_SIZE) * 0.5,
		));

		// 스크롤 영역: 헤더 아래 박스 내부 전체.
		const scrollX = SCROLL_HORIZONTAL_PADDING;
		const scrollY = HEADER_HEIGHT;
		const scrollW = boxWidth - SCROLL_HORIZONTAL_PADDING * 2;
		const scrollH = boxHeight - HEADER_HEIGHT - SCROLL_VERTICAL_PADDING;
		this.#scrollContainerNode.setLocalPosition(Vector2.create(scrollX, scrollY));
		this.#scrollContainerNode.setContentSize(Vector2.create(scrollW, scrollH));

		// 카드 가변 높이로 누적 배치.
		const innerSize = this.#scrollView.getInnerContentSize();
		const cardWidth = innerSize.x;
		let cursorY = 0;
		for (const card of this.#cards) {
			const cardHeight = card.getDesiredHeight();
			card.setLocalPosition(Vector2.create(0, cursorY));
			card.setContentSize(Vector2.create(cardWidth, cardHeight));
			cursorY += cardHeight + CARD_GAP;
		}
		// 마지막 카드 아래 GAP 만큼은 스크롤 콘텐트에서 제거.
		if (cursorY > 0) cursorY -= CARD_GAP;

		this.#scrollView.setScrollContentSize(Vector2.create(innerSize.x, cursorY));

		// 박스 위치 트윈 재반영.
		this.applyAnimation();
	}

	//==============================================================================
	// 터치: 박스 영역 밖(=dim)을 탭하면 닫기. 박스 안 클릭은 자식들이 받아 처리.
	//==============================================================================
	touchPress(viewInputPosition) {
		if (this.#boxNode && this.#boxNode.contains(viewInputPosition)) {
			super.touchPress(viewInputPosition);
			return;
		}
		this.hide();
	}
	touchMove() {}
	touchRelease() {}
	touchCancel() {}
}
