//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Rect } from "../libs/vanilla.js/src/base/rect.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { Engine, EngineConfiguration } from "../libs/vanilla.js/src/core/engine.js";
import { Graphic } from "../libs/vanilla.js/src/core/graphic.js";
import { Scene } from "../libs/vanilla.js/src/core/scene.js";
import { ViewScaleMode } from "../libs/vanilla.js/src/core/viewmanager.js";
import { TouchRaycaster } from "../libs/vanilla.js/src/core/touchraycaster.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../libs/vanilla.js/src/core/component/label.js";
import { UIButton } from "../libs/vanilla.js/src/ui/uibutton.js";
import { DEVTools } from "../libs/vanilla.js/src/misc/devtools.js";
import { setDefaultFontFace, isUseSystemFont, markUseSystemFont } from "./uihelper.js";
import { MessagePopup } from "./messagepopup.js";
import { ResultPopup } from "./resultpopup.js";
import { PartId } from "./part.js";
import { addThemeChangeListener, getCurrentTheme } from "./theme.js";
import { IntroPart } from "./intropart.js";
import { TitlePart } from "./titlepart.js";
import { GamesPart } from "./gamespart.js";
import { AchievementPart } from "./achievementpart.js";
import { ConfigurationPart } from "./configurationpart.js";
import { DailyMissionPart } from "./dailymissionpart.js";
import { MinesweeperPart } from "./minesweeperpart.js";
import { TicTacToePart } from "./tictactoepart.js";
import { MemoryMatchPart } from "./memorymatchpart.js";
import { Puzzle15Part } from "./puzzle15part.js";
import { WhackAMolePart } from "./whackamolepart.js";
import { NumberGuessPart } from "./numberguesspart.js";
import { ReactionTimePart } from "./reactiontimepart.js";
import { SimonPart } from "./simonpart.js";
import { RpsPart } from "./rpspart.js";
import { Game2048Part } from "./game2048part.js";
import { QuickMathPart } from "./quickmathpart.js";
import { SequencePart } from "./sequencepart.js";
import { OddEvenPart } from "./oddevenpart.js";
import { FindOddPart } from "./findoddpart.js";
import { StroopPart } from "./strooppart.js";
import { DiceBetPart } from "./dicebetpart.js";
import { HighLowPart } from "./highlowpart.js";
import { BlackjackPart } from "./blackjackpart.js";
import { SlotPart } from "./slotpart.js";
import { NumberMemoryPart } from "./numbermemorypart.js";
import { CountStopPart } from "./countstoppart.js";
import { TargetTapPart } from "./targettappart.js";
import { ColorCountPart } from "./colorcountpart.js";
import { DirectionPart } from "./directionpart.js";
import { SameIconPart } from "./sameiconpart.js";
import { CoinFlipPart } from "./coinflippart.js";


//==============================================================================
// 레이아웃 상수.
//==============================================================================
const REFERENCE_WIDTH = 1080;
const REFERENCE_HEIGHT = 1920;
const NAVIGATION_HEIGHT = 140;
const NAVIGATION_BACK_BUTTON_WIDTH = 120;
const NAVIGATION_BACK_BUTTON_HEIGHT = 100;
const NAVIGATION_PADDING = 24;


//==============================================================================
// 메인 씬.
// - root
//   - safeArea
//     - background
//     - contentArea (활성 파트가 자식으로 들어감)
//     - navigationArea (상단 고정)
//==============================================================================
export class MainScene extends Scene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { DEVTools } */ #devtools;
	/** @private @type { TouchRaycaster } */ #touchRaycaster;
	/** @private @type { WorldNode } */ #safeAreaNode;
	/** @private @type { WorldNode } */ #backgroundNode;
	/** @private @type { WorldNode } */ #contentAreaNode;
	/** @private @type { WorldNode } */ #navigationNode;
	/** @private @type { WorldNode } */ #navigationBackButtonNode;
	/** @private @type { WorldNode } */ #navigationTitleNode;
	/** @private @type { Label } */ #navigationTitleLabel;
	/** @private @type { System.Map<string, import("./part.js").Part> } */ #parts;
	/** @private @type { string[] } */ #partStack;
	/** @private @type { Rect } */ #lastSafeAreaRect;
	/** @private @type { FontFace | null } */ #defaultFontFace;
	/** @private @type { MessagePopup } */ #popup;
	/** @private @type { ResultPopup } */ #resultPopup;
	/** @private @type { Paint | null } */ #backgroundPaint;
	/** @private @type { Paint | null } */ #navigationPaint;
	/** @private @type { Paint | null } */ #navigationBackButtonPaint;
	/** @private @type { Label | null } */ #navigationBackButtonLabel;
	/** @private @type { number } */ #lastViewSizeX;
	/** @private @type { number } */ #lastViewSizeY;

	//==============================================================================
	// 비동기 로드. (폰트)
	//==============================================================================
	/**
	 * @override
	 * @param { Engine } engine
	 */
	async load(engine) {
		await super.load(engine);

		// Cafe24Ssurround 폰트 로드.
		this.#defaultFontFace = null;
		try {
			const fontFace = new System.FontFace("Cafe24Ssurround", `url("./assets/fonts/Cafe24Ssurround-v2.0.woff2")`);
			await fontFace.load();
			System.document.fonts.add(fontFace);
			this.#defaultFontFace = fontFace;
			setDefaultFontFace(fontFace);
		}
		catch (error) {
			console.error("[MainScene] 폰트 로드 실패:", error);
		}
	}

	//==============================================================================
	// 초기화.
	//==============================================================================
	/**
	 * @override
	 * @param { Engine } engine
	 */
	initialize(engine) {
		super.initialize(engine);

		// 가로폭 고정 + 세로 자유.
		const viewManager = engine.getViewManager();
		viewManager.setViewScaleMode(ViewScaleMode.stretchWidthExpandHeight);

		// 개발자 도구.
		this.#devtools = new DEVTools();
		this.#devtools.setEngine(engine);
		this.#devtools.setRootNodes([this.getRoot()]);

		// 터치 레이캐스터.
		this.#touchRaycaster = new TouchRaycaster();
		this.#touchRaycaster.setRootNode(this.getRoot());

		this.#parts = new System.Map();
		this.#partStack = [];
		this.#lastSafeAreaRect = Rect.zero();
		this.#lastViewSizeX = 0;
		this.#lastViewSizeY = 0;

		// 계층 구성.
		this.buildHierarchy();

		// 파트 생성.
		this.createParts();

		// 모든 라벨에 기본 폰트 일괄 적용. (uihelper로 안 만든 라벨들 포함)
		this.applyDefaultFontToAllLabels(this.getRoot());

		// 테마 변경 리스너 + 현재 테마 즉시 적용.
		addThemeChangeListener((theme) => this.applyTheme(theme));
		this.applyTheme(getCurrentTheme());

		// 인트로부터 시작.
		this.replacePart(PartId.intro);
	}

	//==============================================================================
	// 메인 씬의 테마 색 적용. (배경, 네비게이션, 뒤로가기 버튼)
	//==============================================================================
	/**
	 * @param { object } theme
	 */
	applyTheme(theme) {
		if (this.#backgroundPaint) {
			this.#backgroundPaint.setColor(Color.createFromHEX(theme.background));
		}
		if (this.#navigationPaint) {
			this.#navigationPaint.setColor(Color.createFromHEX(theme.surfaceVariant));
		}
		if (this.#navigationBackButtonPaint) {
			this.#navigationBackButtonPaint.setColor(Color.createFromHEX(theme.surface));
		}
		if (this.#navigationTitleLabel) {
			this.#navigationTitleLabel.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
		}
	}

	//==============================================================================
	// 노드 트리에 있는 모든 라벨에 기본 폰트 적용.
	//==============================================================================
	/**
	 * @param { WorldNode } node
	 */
	applyDefaultFontToAllLabels(node) {
		if (!this.#defaultFontFace || !node) {
			return;
		}
		if (typeof node.getAllComponents === "function") {
			const components = node.getAllComponents();
			for (const component of components) {
				if (component instanceof Label && !isUseSystemFont(component)) {
					component.setFont(this.#defaultFontFace);
				}
			}
		}
		if (typeof node.getChildren === "function") {
			const children = node.getChildren();
			for (const child of children) {
				this.applyDefaultFontToAllLabels(child);
			}
		}
	}

	//==============================================================================
	// 노드 계층 구성.
	//==============================================================================
	buildHierarchy() {
		const root = this.getRoot();

		// 세이프 에어리어 컨테이너.
		this.#safeAreaNode = new WorldNode();
		this.#safeAreaNode.setName("safeArea");
		this.#safeAreaNode.setPivot(Pivot.topLeft);
		this.#safeAreaNode.setAnchor(Pivot.topLeft);
		root.addChild(this.#safeAreaNode);

		// 배경.
		this.#backgroundNode = new WorldNode();
		this.#backgroundNode.setName("background");
		this.#backgroundNode.setPivot(Pivot.topLeft);
		this.#backgroundNode.setAnchor(Pivot.topLeft);
		this.#backgroundPaint = this.#backgroundNode.addComponent(Paint);
		this.#safeAreaNode.addChild(this.#backgroundNode);

		// 컨텐트 영역. (파트들이 들어감)
		this.#contentAreaNode = new WorldNode();
		this.#contentAreaNode.setName("contentArea");
		this.#contentAreaNode.setPivot(Pivot.topLeft);
		this.#contentAreaNode.setAnchor(Pivot.topLeft);
		this.#safeAreaNode.addChild(this.#contentAreaNode);

		// 네비게이션 영역. (상단 고정, 컨텐트 위에 그려짐)
		this.#navigationNode = new WorldNode();
		this.#navigationNode.setName("navigation");
		this.#navigationNode.setPivot(Pivot.topLeft);
		this.#navigationNode.setAnchor(Pivot.topLeft);
		this.#navigationPaint = this.#navigationNode.addComponent(Paint);
		this.#safeAreaNode.addChild(this.#navigationNode);

		// 네비게이션 뒤로가기 버튼.
		this.#navigationBackButtonNode = new WorldNode();
		this.#navigationBackButtonNode.setName("backButton");
		this.#navigationBackButtonNode.setPivot(Pivot.middleCenter);
		this.#navigationBackButtonNode.setAnchor(Pivot.topLeft);
		this.#navigationBackButtonNode.setContentSize(Vector2.create(NAVIGATION_BACK_BUTTON_WIDTH, NAVIGATION_BACK_BUTTON_HEIGHT));
		this.#navigationBackButtonNode.setInteractable(true);
		this.#navigationBackButtonPaint = this.#navigationBackButtonNode.addComponent(Paint);
		this.#navigationBackButtonPaint.setRoundSize(12);
		this.#navigationBackButtonLabel = this.#navigationBackButtonNode.addComponent(Label);
		this.#navigationBackButtonLabel.setText("🔙");
		this.#navigationBackButtonLabel.setFontSize(56);
		this.#navigationBackButtonLabel.setTextColor(Color.createFromHEX("#ffffff"));
		this.#navigationBackButtonLabel.setTextAlign("center");
		this.#navigationBackButtonLabel.setTextBaseline("middle");
		markUseSystemFont(this.#navigationBackButtonLabel);
		const backButton = this.#navigationBackButtonNode.addComponent(UIButton);
		backButton.setClickEvent(() => { this.popPart(); });
		this.#navigationNode.addChild(this.#navigationBackButtonNode);

		// 네비게이션 타이틀 라벨.
		this.#navigationTitleNode = new WorldNode();
		this.#navigationTitleNode.setName("navTitle");
		this.#navigationTitleNode.setPivot(Pivot.middleCenter);
		this.#navigationTitleNode.setAnchor(Pivot.topLeft);
		this.#navigationTitleLabel = this.#navigationTitleNode.addComponent(Label);
		this.#navigationTitleLabel.setText("");
		this.#navigationTitleLabel.setFontSize(56);
		this.#navigationTitleLabel.setTextColor(Color.createFromHEX("#ffffff"));
		this.#navigationTitleLabel.setTextAlign("center");
		this.#navigationTitleLabel.setTextBaseline("middle");
		this.#navigationNode.addChild(this.#navigationTitleNode);

		// 메시지 팝업. (safeArea 의 마지막 자식 = 가장 위에 그려지고 raycast 에서 가장 먼저 hit)
		this.#popup = new MessagePopup();
		this.#popup.setName("popup");
		this.#safeAreaNode.addChild(this.#popup);

		// 결과 팝업. (메시지 팝업과는 별도 컴포넌트)
		this.#resultPopup = new ResultPopup();
		this.#resultPopup.setName("resultPopup");
		this.#safeAreaNode.addChild(this.#resultPopup);
	}

	//==============================================================================
	// 파트 생성.
	//==============================================================================
	createParts() {
		const partInstances = [
			new IntroPart(),
			new TitlePart(),
			new GamesPart(),
			new AchievementPart(),
			new ConfigurationPart(),
			new DailyMissionPart(),
			new MinesweeperPart(),
			new TicTacToePart(),
			new MemoryMatchPart(),
			new Puzzle15Part(),
			new WhackAMolePart(),
			new NumberGuessPart(),
			new ReactionTimePart(),
			new SimonPart(),
			new RpsPart(),
			new Game2048Part(),
			new QuickMathPart(),
			new SequencePart(),
			new OddEvenPart(),
			new FindOddPart(),
			new StroopPart(),
			new DiceBetPart(),
			new HighLowPart(),
			new BlackjackPart(),
			new SlotPart(),
			new NumberMemoryPart(),
			new CountStopPart(),
			new TargetTapPart(),
			new ColorCountPart(),
			new DirectionPart(),
			new SameIconPart(),
			new CoinFlipPart(),
		];

		for (const part of partInstances) {
			part.setApp(this);
			part.setName(part.getPartId());
			this.#contentAreaNode.addChild(part);
			part.build();
			this.#parts.set(part.getPartId(), part);
		}
	}

	//==============================================================================
	// 파트 푸시. (현재 파트 위로 새 파트 활성화)
	//==============================================================================
	pushPart(partId) {
		const part = this.#parts.get(partId);
		if (!part) {
			console.warn(`[MainScene] unknown part: ${partId}`);
			return;
		}
		this.deactivateCurrent();
		this.#partStack.push(partId);
		this.activate(part);
	}

	//==============================================================================
	// 파트 팝. (현재 파트를 닫고 이전 파트로)
	// - 현재 파트가 shouldConfirmExit() 이면 확인 팝업 후에만 진행.
	//==============================================================================
	popPart() {
		if (this.#partStack.length <= 1) {
			return;
		}
		const currentId = this.#partStack[this.#partStack.length - 1];
		const current = this.#parts.get(currentId);
		if (current && current.shouldConfirmExit()) {
			this.showConfirm(current.getExitConfirmMessage(), () => {
				this.performPopPart();
			});
			return;
		}
		this.performPopPart();
	}

	//==============================================================================
	// 실제 파트 팝 처리.
	//==============================================================================
	performPopPart() {
		if (this.#partStack.length <= 1) {
			return;
		}
		this.deactivateCurrent();
		this.#partStack.pop();
		const previousId = this.#partStack[this.#partStack.length - 1];
		const previous = this.#parts.get(previousId);
		this.activate(previous);
	}

	//==============================================================================
	// 파트 교체. (스택을 비우고 새 파트 1개로 교체)
	//==============================================================================
	replacePart(partId) {
		const part = this.#parts.get(partId);
		if (!part) {
			console.warn(`[MainScene] unknown part: ${partId}`);
			return;
		}
		this.deactivateCurrent();
		this.#partStack = [partId];
		this.activate(part);
	}

	//==============================================================================
	// 활성 파트 비활성화.
	//==============================================================================
	deactivateCurrent() {
		if (this.#partStack.length === 0) {
			return;
		}
		const currentId = this.#partStack[this.#partStack.length - 1];
		const current = this.#parts.get(currentId);
		if (!current) {
			return;
		}
		current.exit();
		current.setActive(false);
	}

	//==============================================================================
	// 파트 활성화.
	//==============================================================================
	activate(part) {
		this.layout();
		part.setActive(true);
		part.enter();
	}

	//==============================================================================
	// 메시지 팝업 - 예/아니오.
	//==============================================================================
	/**
	 * @param { string } message
	 * @param { (() => void) | null } onYes
	 * @param { (() => void) | null } [onNo]
	 * @param { { yesLabel?: string, noLabel?: string, subMessage?: string } } [options]
	 */
	showConfirm(message, onYes, onNo, options) {
		this.#popup.setLocalPosition(Vector2.zero());
		this.#popup.setContentSize(this.#safeAreaNode.getContentSize());
		this.#popup.showConfirm(message, onYes, onNo, options);
	}

	//==============================================================================
	// 메시지 팝업 - 확인.
	//==============================================================================
	/**
	 * @param { string } message
	 * @param { (() => void) | null } [onOk]
	 * @param { { okLabel?: string, subMessage?: string } } [options]
	 */
	showAlert(message, onOk, options) {
		this.#popup.setLocalPosition(Vector2.zero());
		this.#popup.setContentSize(this.#safeAreaNode.getContentSize());
		this.#popup.showAlert(message, onOk, options);
	}

	//==============================================================================
	// 팝업 노출 여부.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isPopupShowing() {
		return this.#popup.isShowing();
	}

	//==============================================================================
	// 결과 팝업.
	// options: { isWon, title, score, stats, onRetry, onExit }
	//==============================================================================
	showResult(options) {
		this.#resultPopup.setLocalPosition(Vector2.zero());
		this.#resultPopup.setContentSize(this.#safeAreaNode.getContentSize());
		this.#resultPopup.show(options);
	}

	//==============================================================================
	// 결과 팝업 노출 여부.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isResultPopupShowing() {
		return this.#resultPopup.isShowing();
	}

	//==============================================================================
	// 활성 파트 반환.
	//==============================================================================
	getActivePart() {
		if (this.#partStack.length === 0) {
			return null;
		}
		const currentId = this.#partStack[this.#partStack.length - 1];
		return this.#parts.get(currentId) || null;
	}

	//==============================================================================
	// 화면 크기 변경됨.
	//==============================================================================
	/**
	 * @override
	 * @param { Vector2 } canvasNativeSize
	 */
	resize(canvasNativeSize) {
		super.resize(canvasNativeSize);
		this.layout();
		const activePart = this.getActivePart();
		if (activePart) {
			activePart.onResize();
		}
	}

	//==============================================================================
	// 레이아웃.
	//==============================================================================
	layout() {
		const safeAreaRect = this.computeSafeAreaRect();
		this.#lastSafeAreaRect = safeAreaRect;

		// 세이프 에어리어 컨테이너.
		this.#safeAreaNode.setLocalPosition(Vector2.create(safeAreaRect.position.x, safeAreaRect.position.y));
		this.#safeAreaNode.setContentSize(safeAreaRect.size);

		// 배경.
		this.#backgroundNode.setLocalPosition(Vector2.zero());
		this.#backgroundNode.setContentSize(safeAreaRect.size);

		// 활성 파트의 네비게이션 노출 여부.
		const activePart = this.getActivePart();
		const showNavigation = activePart ? activePart.hasNavigation() : false;
		this.#navigationNode.setActive(showNavigation);

		// 네비게이션.
		this.#navigationNode.setLocalPosition(Vector2.zero());
		this.#navigationNode.setContentSize(Vector2.create(safeAreaRect.size.x, NAVIGATION_HEIGHT));

		// 뒤로가기 버튼.
		const backButtonX = NAVIGATION_PADDING + NAVIGATION_BACK_BUTTON_WIDTH * 0.5;
		const backButtonY = NAVIGATION_HEIGHT * 0.5;
		this.#navigationBackButtonNode.setLocalPosition(Vector2.create(backButtonX, backButtonY));
		const canPop = this.#partStack.length > 1;
		this.#navigationBackButtonNode.setActive(canPop);
		// 활성 파트가 지정한 아이콘 적용 (기본 🔙, 모달이면 ❌ 등).
		if (activePart && this.#navigationBackButtonLabel) {
			this.#navigationBackButtonLabel.setText(activePart.getNavigationBackIcon());
		}

		// 네비게이션 타이틀.
		this.#navigationTitleNode.setLocalPosition(Vector2.create(safeAreaRect.size.x * 0.5, NAVIGATION_HEIGHT * 0.5));
		const titleText = activePart && activePart.hasNavigation() ? activePart.getNavigationTitle() : "";
		this.#navigationTitleLabel.setText(titleText);

		// 컨텐트 영역. (네비게이션이 있으면 그 아래로, 없으면 세이프 에어리어 전체)
		const contentY = showNavigation ? NAVIGATION_HEIGHT : 0;
		const contentHeight = safeAreaRect.size.y - contentY;
		this.#contentAreaNode.setLocalPosition(Vector2.create(0, contentY));
		this.#contentAreaNode.setContentSize(Vector2.create(safeAreaRect.size.x, contentHeight));

		// 활성 파트.
		if (activePart) {
			activePart.setLocalPosition(Vector2.zero());
			activePart.setContentSize(this.#contentAreaNode.getContentSize());
			activePart.onResize();
		}

		// 팝업 (safeArea 전체를 덮음).
		if (this.#popup) {
			this.#popup.setLocalPosition(Vector2.zero());
			this.#popup.setContentSize(safeAreaRect.size);
			if (this.#popup.isShowing()) {
				this.#popup.layout();
			}
		}
		if (this.#resultPopup) {
			this.#resultPopup.setLocalPosition(Vector2.zero());
			this.#resultPopup.setContentSize(safeAreaRect.size);
			if (this.#resultPopup.isShowing()) {
				this.#resultPopup.layout();
			}
		}
	}

	//==============================================================================
	// 세이프 에어리어 계산. (뷰 좌표계 기준)
	//==============================================================================
	computeSafeAreaRect() {
		const engine = this.getEngine();
		const viewManager = engine.getViewManager();
		const viewSize = viewManager.getViewSize();
		const targetScale = viewManager.getTargetResolutionScale();

		// CSS 픽셀 기준 세이프 에어리어 인셋.
		const div = System.document.createElement("div");
		div.style.position = "absolute";
		div.style.visibility = "hidden";
		div.style.paddingTop = "env(safe-area-inset-top)";
		div.style.paddingRight = "env(safe-area-inset-right)";
		div.style.paddingBottom = "env(safe-area-inset-bottom)";
		div.style.paddingLeft = "env(safe-area-inset-left)";
		System.document.body.appendChild(div);
		const computedStyle = System.window.getComputedStyle(div);
		const insetTopCss = System.Number.parseInt(computedStyle.paddingTop) || 0;
		const insetRightCss = System.Number.parseInt(computedStyle.paddingRight) || 0;
		const insetBottomCss = System.Number.parseInt(computedStyle.paddingBottom) || 0;
		const insetLeftCss = System.Number.parseInt(computedStyle.paddingLeft) || 0;
		System.document.body.removeChild(div);

		// CSS 픽셀 → 뷰 좌표.
		const scale = targetScale > 0 ? targetScale : 1;
		const insetTop = insetTopCss / scale;
		const insetRight = insetRightCss / scale;
		const insetBottom = insetBottomCss / scale;
		const insetLeft = insetLeftCss / scale;

		const x = insetLeft;
		const y = insetTop;
		const width = System.Math.max(viewSize.x - insetLeft - insetRight, 0);
		const height = System.Math.max(viewSize.y - insetTop - insetBottom, 0);
		return Rect.create(x, y, width, height);
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @override
	 * @param { number } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);

		const engine = this.getEngine();

		// viewSize 변화 감지 → 자동 layout 재호출.
		// (모바일 주소창 표시/숨김으로 100vh 가 동적으로 변하는 경우 등에서
		//  resize 이벤트만으로는 누락될 수 있어 매 tick 보정한다)
		const viewManager = engine.getViewManager();
		const viewSize = viewManager.getViewSize();
		if (viewSize.x !== this.#lastViewSizeX || viewSize.y !== this.#lastViewSizeY) {
			this.#lastViewSizeX = viewSize.x;
			this.#lastViewSizeY = viewSize.y;
			this.layout();
		}

		const timeManager = engine.getTimeManager();
		const unscaledTimeDelta = timeManager.getUnscaleDeltaTime();
		this.#devtools.tick(unscaledTimeDelta);
	}

	//==============================================================================
	// 터치 처리. 디브툴이 입력을 가져가지 않을 때만 게임으로 라우팅한다.
	//==============================================================================
	isDevToolsCapturingInput() {
		return this.#devtools.isVisible() && this.#devtools.isPointerInsidePanel();
	}

	/**
	 * @override
	 * @param { Vector2 } viewInputPosition
	 */
	touchPress(viewInputPosition) {
		if (this.isDevToolsCapturingInput()) {
			return;
		}
		this.#touchRaycaster.touchPress(viewInputPosition);
	}

	/**
	 * @override
	 * @param { Vector2 } viewInputPosition
	 */
	touchMove(viewInputPosition) {
		if (this.isDevToolsCapturingInput()) {
			return;
		}
		this.#touchRaycaster.touchMove(viewInputPosition);
	}

	/**
	 * @override
	 * @param { Vector2 } viewInputPosition
	 */
	touchRelease(viewInputPosition) {
		if (this.isDevToolsCapturingInput()) {
			return;
		}
		this.#touchRaycaster.touchRelease(viewInputPosition);
	}

	/**
	 * @override
	 * @param { Vector2 } viewInputPosition
	 */
	touchCancel(viewInputPosition) {
		if (this.isDevToolsCapturingInput()) {
			return;
		}
		this.#touchRaycaster.touchCancel(viewInputPosition);
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	preDraw(graphic) {
		super.preDraw(graphic);

		const engine = this.getEngine();
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const viewManager = engine.getViewManager();
		const canvasNativeSize = viewManager.getCanvasNativeSize();

		// 캔버스 전체를 테마의 sceneBackground 색으로 칠하기 (세이프 에어리어 바깥 영역 포함).
		viewManager.applyCanvasNativeRect(canvasRenderingContext);
		const sceneBgColor = getCurrentTheme().sceneBackground;
		graphic.setFillColor(Color.createFromHEX(sceneBgColor));
		graphic.drawRect(Rect.create(0, 0, canvasNativeSize.x, canvasNativeSize.y));

		// 뷰 좌표계 적용.
		viewManager.applyViewRect(canvasRenderingContext);
	}

	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	postDraw(graphic) {
		super.postDraw(graphic);
		this.#devtools.draw(graphic);
	}
}


//==============================================================================
// 엔진 기동.
//==============================================================================
const engineConfiguration = new EngineConfiguration();
engineConfiguration.referenceResolutionSize = Vector2.create(REFERENCE_WIDTH, REFERENCE_HEIGHT);
engineConfiguration.useStatistics = false;
engineConfiguration.title = "미니게임 컬렉션";
const engine = new Engine(engineConfiguration);
const scene = new MainScene();
engine.run(scene);
