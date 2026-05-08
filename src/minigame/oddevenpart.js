//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../../libs/vanilla.js/src/core/component/paint.js";
import { Text } from "../../libs/vanilla.js/src/core/component/text.js";
import { Part, PartId } from "../part.js";
import { createButtonNode } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const GAME_DURATION = 30;


//==============================================================================
// 선택 버튼 노드.
//==============================================================================
class OEButton extends WorldNode {
	/** @type { string } */ choice;
	/** @private @type { OddEvenPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	constructor(part, choice, text) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.choice = choice;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#text = this.addComponent(Text);
		this.#text.setText(text);
		this.#text.setFontSize(80);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		const isOdd = this.choice === "odd";
		this.#paint.setColor(Color.createFromHEX(isOdd ? theme.primary : theme.secondary));
		this.#text.setTextColor(Color.createFromHEX(isOdd ? theme.onPrimary : theme.onSecondary));
	}

	setFontSize(size) { this.#text.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onChoice(this.choice);
	}
}


//==============================================================================
// 홀짝 파트.
//==============================================================================
export class OddEvenPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #numberTextNode;
	/** @private @type { Text } */ #numberText;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { OEButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #correctCount;
	/** @private @type { number } */ #wrongCount;
	/** @private @type { number } */ #currentNumber;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#buttons = [];
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#currentNumber = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.oddEven; }
	getNavigationTitle() { return "홀짝"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoTextNode = this.makeText(40);
		this.addChild(this.#infoTextNode);
		this.#infoText = this.#infoTextNode.getComponent(Text);

		this.#numberTextNode = this.makeText(220);
		this.addChild(this.#numberTextNode);
		this.#numberText = this.#numberTextNode.getComponent(Text);

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		this.#buttons.push(new OEButton(this, "odd", "홀"));
		this.#buttons.push(new OEButton(this, "even", "짝"));
		for (const b of this.#buttons) this.#buttonsNode.addChild(b);

		this.#resetButtonNode = createButtonNode(
			"다시하기",
			Vector2.create(360, 120),
			Color.createFromHEX(getCurrentGameTheme().primary),
			Color.createFromHEX(getCurrentGameTheme().onPrimary),
			48,
			() => { this.resetGame(); },
		);
		this.#resetButtonPaint = this.#resetButtonNode.getComponent(Paint);
		this.#resetButtonText = this.#resetButtonNode.getComponent(Text);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	makeText(size) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const text = node.addComponent(Text);
		text.setFontSize(size);
		text.setTextAlign("center");
		text.setTextBaseline("middle");
		text.setText("");
		return node;
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#infoText) this.#infoText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#numberText) this.#numberText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonText) this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#buttons) b.refreshAppearance();
	}

	resetGame() {
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.nextNumber();
		this.refreshInfo();
	}

	nextNumber() {
		this.#currentNumber = System.Math.floor(System.Math.random() * 999) + 1;
		this.#numberText.setText(String(this.#currentNumber));
	}

	refreshInfo() {
		const t = System.Math.ceil(this.#remainingTime);
		this.#infoText.setText(`시간: ${t}초    정답 ${this.#correctCount}    오답 ${this.#wrongCount}`);
	}

	tick(timeDelta) {
		super.tick(timeDelta);
		if (!this.#isStarted || this.#isGameOver) return;
		this.#remainingTime -= timeDelta;
		if (this.#remainingTime <= 0) {
			this.#remainingTime = 0;
			this.refreshInfo();
			this.endGame();
			return;
		}
		this.refreshInfo();
	}

	onChoice(choice) {
		if (this.#isGameOver) return;
		const isOdd = (this.#currentNumber % 2) === 1;
		const correct = (isOdd && choice === "odd") || (!isOdd && choice === "even");
		if (correct) this.#correctCount += 1;
		else { this.#wrongCount += 1; this.#remainingTime = System.Math.max(0, this.#remainingTime - 2); }
		this.nextNumber();
		this.refreshInfo();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 16;
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - gap) / 2);
		const buttonH = 220;

		const infoH = 60;
		const numberH = 280;
		const resetH = 120;
		const vGap = 40;
		const totalH = infoH + vGap + numberH + vGap + buttonH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#numberTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + numberH * 0.5));
		cy += numberH + vGap;
		const btnX = (contentSize.x - (buttonW * 2 + gap)) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(btnX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(buttonW * 2 + gap, buttonH));
		for (let i = 0; i < this.#buttons.length; ++i) {
			this.#buttons[i].setLocalPosition(Vector2.create(i * (buttonW + gap), 0));
			this.#buttons[i].setContentSize(Vector2.create(buttonW, buttonH));
			this.#buttons[i].setFontSize(96);
		}
		cy += buttonH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const score = System.Math.max(0, this.#correctCount * 30 - this.#wrongCount * 15);
		const total = this.#correctCount + this.#wrongCount;
		const acc = total > 0 ? System.Math.round((this.#correctCount / total) * 100) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: this.#correctCount >= 20,
			title: "타임 오버!",
			score,
			stats: [
				`정답: ${this.#correctCount}`,
				`오답: ${this.#wrongCount}`,
				`정확도: ${acc}%`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
