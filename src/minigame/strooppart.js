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
// 단어 의미: 빨강/파랑/초록/노랑.
const WORD_INFOS = [
	{ word: "빨강", hex: "#ef4444" },
	{ word: "파랑", hex: "#3b82f6" },
	{ word: "초록", hex: "#22c55e" },
	{ word: "노랑", hex: "#eab308" },
];


//==============================================================================
// 선택 버튼.
//==============================================================================
class StroopButton extends WorldNode {
	/** @type { string } */ choice; // "match" | "nomatch"
	/** @private @type { StroopPart } */ #part;
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
		this.#text.setFontSize(64);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		const isMatch = this.choice === "match";
		this.#paint.setColor(Color.createFromHEX(isMatch ? "#22c55e" : "#ef4444"));
		this.#text.setTextColor(Color.createFromHEX("#ffffff"));
	}

	setFontSize(size) { this.#text.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onChoice(this.choice);
	}
}


//==============================================================================
// 스트룹 파트.
//==============================================================================
export class StroopPart extends Part {
	/** @private @type { WorldNode } */ #infoTextNode;
	/** @private @type { Text } */ #infoText;
	/** @private @type { WorldNode } */ #wordTextNode;
	/** @private @type { Text } */ #wordText;
	/** @private @type { WorldNode } */ #hintTextNode;
	/** @private @type { Text } */ #hintText;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { StroopButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #remainingTime;
	/** @private @type { number } */ #correctCount;
	/** @private @type { number } */ #wrongCount;
	/** @private @type { boolean } */ #isMatch;       // 단어의 의미와 색이 일치?
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#buttons = [];
		this.#remainingTime = GAME_DURATION;
		this.#correctCount = 0;
		this.#wrongCount = 0;
		this.#isMatch = false;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.stroop; }
	getNavigationTitle() { return "스트룹"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoTextNode = this.makeText(40);
		this.addChild(this.#infoTextNode);
		this.#infoText = this.#infoTextNode.getComponent(Text);

		this.#hintTextNode = this.makeText(36);
		this.addChild(this.#hintTextNode);
		this.#hintText = this.#hintTextNode.getComponent(Text);
		this.#hintText.setText("단어의 '의미'와 '색'이 같으면 일치");

		this.#wordTextNode = this.makeText(180);
		this.addChild(this.#wordTextNode);
		this.#wordText = this.#wordTextNode.getComponent(Text);

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		this.#buttons.push(new StroopButton(this, "match", "일치"));
		this.#buttons.push(new StroopButton(this, "nomatch", "불일치"));
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
		if (this.#hintText) this.#hintText.setTextColor(Color.createFromHEX(theme.onSurfaceVariant));
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
		this.nextWord();
		this.refreshInfo();
	}

	nextWord() {
		const wordInfo = WORD_INFOS[System.Math.floor(System.Math.random() * WORD_INFOS.length)];
		const isMatch = System.Math.random() < 0.5;
		this.#isMatch = isMatch;
		let colorInfo = wordInfo;
		if (!isMatch) {
			while (colorInfo === wordInfo) {
				colorInfo = WORD_INFOS[System.Math.floor(System.Math.random() * WORD_INFOS.length)];
			}
		}
		this.#wordText.setText(wordInfo.word);
		this.#wordText.setTextColor(Color.createFromHEX(colorInfo.hex));
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
		const correct = (choice === "match" && this.#isMatch) || (choice === "nomatch" && !this.#isMatch);
		if (correct) this.#correctCount += 1;
		else { this.#wrongCount += 1; this.#remainingTime = System.Math.max(0, this.#remainingTime - 2); }
		this.nextWord();
		this.refreshInfo();
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 16;
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - gap) / 2);
		const buttonH = 200;

		const infoH = 60;
		const hintH = 50;
		const wordH = 240;
		const resetH = 120;
		const vGap = 28;
		const totalH = infoH + vGap + hintH + vGap + wordH + vGap + buttonH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#hintTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + hintH * 0.5));
		cy += hintH + vGap;
		this.#wordTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + wordH * 0.5));
		cy += wordH + vGap;
		const btnX = (contentSize.x - (buttonW * 2 + gap)) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(btnX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(buttonW * 2 + gap, buttonH));
		for (let i = 0; i < this.#buttons.length; ++i) {
			this.#buttons[i].setLocalPosition(Vector2.create(i * (buttonW + gap), 0));
			this.#buttons[i].setContentSize(Vector2.create(buttonW, buttonH));
			this.#buttons[i].setFontSize(72);
		}
		cy += buttonH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const score = System.Math.max(0, this.#correctCount * 25 - this.#wrongCount * 15);
		const total = this.#correctCount + this.#wrongCount;
		const acc = total > 0 ? System.Math.round((this.#correctCount / total) * 100) : 0;
		const app = this.getApp();
		app.showResult({
			isWon: this.#correctCount >= 15,
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
