//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { addThemeChangeListener, getCurrentTheme } from "./theme.js";


//==============================================================================
// 파트 식별자.
//==============================================================================
export const PartId = {
	intro: "intro",
	title: "title",
	games: "games",
	achievement: "achievement",
	configuration: "configuration",
	dailyMission: "dailyMission",
	minesweeper: "minesweeper",
	ticTacToe: "ticTacToe",
	memoryMatch: "memoryMatch",
	puzzle15: "puzzle15",
	whackAMole: "whackAMole",
	numberGuess: "numberGuess",
	reactionTime: "reactionTime",
	simon: "simon",
	rps: "rps",
	game2048: "game2048",
	quickMath: "quickMath",
	sequence: "sequence",
	oddEven: "oddEven",
	findOdd: "findOdd",
	stroop: "stroop",
	diceBet: "diceBet",
	highLow: "highLow",
	blackjack: "blackjack",
	slot: "slot",
	numberMemory: "numberMemory",
	countStop: "countStop",
	targetTap: "targetTap",
	colorCount: "colorCount",
	direction: "direction",
	sameIcon: "sameIcon",
	coinFlip: "coinFlip",
};


//==============================================================================
// 파트 베이스 클래스.
// - 컨텐트 영역에 자식으로 들어가서 활성/비활성으로 켜고 끈다.
//==============================================================================
export class Part extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { import("./main.js").MainScene } */ #app;
	/** @private @type { boolean } */ #isBuilt;
	/** @private @type { Paint | null } */ #backgroundPaint;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setLocalPosition(Vector2.zero());
		this.setActive(false);
		this.#app = null;
		this.#isBuilt = false;
		this.#backgroundPaint = null;
		addThemeChangeListener((theme) => this.applyTheme(theme));
	}

	//==============================================================================
	// 테마 색이 자동 적용되는 배경 Paint 컴포넌트 부착.
	// - onBuild() 안에서 호출. theme.partBackground 를 사용.
	//==============================================================================
	/**
	 * @returns { Paint }
	 */
	setupBackground() {
		this.#backgroundPaint = this.addComponent(Paint);
		const theme = getCurrentTheme();
		this.#backgroundPaint.setColor(Color.createFromHEX(theme.background));
		return this.#backgroundPaint;
	}

	//==============================================================================
	// 배경 Paint 반환.
	//==============================================================================
	getBackgroundPaint() {
		return this.#backgroundPaint;
	}

	//==============================================================================
	// 테마 변경 시 호출. (자식 클래스에서 super.applyTheme(theme) 호출 + 추가 색 갱신)
	//==============================================================================
	/**
	 * @virtual
	 * @param { object } theme
	 */
	applyTheme(theme) {
		if (this.#backgroundPaint) {
			this.#backgroundPaint.setColor(Color.createFromHEX(theme.background));
		}
	}

	//==============================================================================
	// 앱(메인 씬) 설정.
	//==============================================================================
	setApp(app) {
		this.#app = app;
	}

	//==============================================================================
	// 앱(메인 씬) 반환.
	//==============================================================================
	getApp() {
		return this.#app;
	}

	//==============================================================================
	// 식별자.
	//==============================================================================
	getPartId() {
		return "";
	}

	//==============================================================================
	// 네비게이션 타이틀.
	//==============================================================================
	getNavigationTitle() {
		return "";
	}

	//==============================================================================
	// 네비게이션 사용 여부.
	//==============================================================================
	hasNavigation() {
		return true;
	}

	//==============================================================================
	// 최초 1회 빌드.
	//==============================================================================
	build() {
		if (this.#isBuilt) {
			return;
		}
		this.#isBuilt = true;
		this.onBuild();
	}

	//==============================================================================
	// 자식 클래스에서 오버라이드 하여 노드 구성.
	//==============================================================================
	/** @virtual */
	onBuild() {
	}

	//==============================================================================
	// 활성화 진입. (showPart에서 호출)
	//==============================================================================
	/** @virtual */
	enter() {
	}

	//==============================================================================
	// 비활성화. (showPart에서 호출)
	//==============================================================================
	/** @virtual */
	exit() {
	}

	//==============================================================================
	// 컨텐트 사이즈가 변경됨.
	//==============================================================================
	/** @virtual */
	onResize() {
	}

	//==============================================================================
	// 네비게이션 뒤로가기 버튼 아이콘. (각 파트별 override 가능)
	// - 기본 "🔙". 모달처럼 닫는 의미면 "❌" 같은 닫기 아이콘 반환.
	//==============================================================================
	/** @virtual @returns { string } */
	getNavigationBackIcon() {
		return "🔙";
	}

	//==============================================================================
	// 뒤로가기 시 확인 팝업이 필요한지 여부.
	//==============================================================================
	/** @virtual @returns { boolean } */
	shouldConfirmExit() {
		return false;
	}

	//==============================================================================
	// 뒤로가기 확인 메시지.
	//==============================================================================
	/** @virtual @returns { string } */
	getExitConfirmMessage() {
		return "이전 화면으로 돌아가시겠습니까?";
	}
}
