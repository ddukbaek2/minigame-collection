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
import { createButtonNode, markUseSystemFont } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const ROCK = 0, SCISSORS = 1, PAPER = 2;
const ICONS = ["✊", "✌️", "✋"];
const NAMES = ["바위", "가위", "보"];
const TOTAL_ROUNDS = 5;


//==============================================================================
// 선택 버튼 노드.
//==============================================================================
class RpsButton extends WorldNode {
	/** @type { number } */ choice;
	/** @private @type { RpsPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Text } */ #text;

	constructor(part, choice) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.choice = choice;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#text = this.addComponent(Text);
		this.#text.setText(ICONS[choice]);
		this.#text.setFontSize(120);
		this.#text.setTextAlign("center");
		this.#text.setTextBaseline("middle");
		markUseSystemFont(this.#text);
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
	}

	setFontSize(size) { this.#text.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onChoice(this.choice);
	}
}


//==============================================================================
// 가위바위보 파트.
//==============================================================================
export class RpsPart extends Part {
	/** @private @type { WorldNode } */ #scoreTextNode;
	/** @private @type { Text } */ #scoreText;
	/** @private @type { WorldNode } */ #showTextNode;
	/** @private @type { Text } */ #showText;
	/** @private @type { WorldNode } */ #resultTextNode;
	/** @private @type { Text } */ #resultText;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { RpsButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Text } */ #resetButtonText;
	/** @private @type { number } */ #wins;
	/** @private @type { number } */ #losses;
	/** @private @type { number } */ #draws;
	/** @private @type { number } */ #round;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#buttons = [];
		this.#wins = 0;
		this.#losses = 0;
		this.#draws = 0;
		this.#round = 0;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.rps; }
	getNavigationTitle() { return "가위바위보"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#round > 0 && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#scoreTextNode = this.makeText(40);
		this.addChild(this.#scoreTextNode);
		this.#scoreText = this.#scoreTextNode.getComponent(Text);

		this.#showTextNode = this.makeText(140);
		this.addChild(this.#showTextNode);
		this.#showText = this.#showTextNode.getComponent(Text);
		markUseSystemFont(this.#showText);

		this.#resultTextNode = this.makeText(56);
		this.addChild(this.#resultTextNode);
		this.#resultText = this.#resultTextNode.getComponent(Text);

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		for (let i = 0; i < 3; ++i) {
			const b = new RpsButton(this, i);
			this.#buttonsNode.addChild(b);
			this.#buttons.push(b);
		}

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

	makeText(fontSize) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const text = node.addComponent(Text);
		text.setFontSize(fontSize);
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
		if (this.#scoreText) this.#scoreText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#showText) this.#showText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resultText) this.#resultText.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonText) this.#resetButtonText.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#buttons) b.refreshAppearance();
	}

	resetGame() {
		this.#wins = 0;
		this.#losses = 0;
		this.#draws = 0;
		this.#round = 0;
		this.#isGameOver = false;
		this.#showText.setText("✊✌️✋");
		this.#resultText.setText("선택하세요");
		this.refreshScore();
	}

	refreshScore() {
		this.#scoreText.setText(`${this.#round}/${TOTAL_ROUNDS}    승 ${this.#wins}  무 ${this.#draws}  패 ${this.#losses}`);
	}

	onChoice(playerChoice) {
		if (this.#isGameOver) return;
		const cpu = System.Math.floor(System.Math.random() * 3);
		const theme = getCurrentGameTheme();
		this.#showText.setText(`${ICONS[playerChoice]}  vs  ${ICONS[cpu]}`);
		// 승패 판정. (player - cpu + 3) % 3 → 0=무, 1=승(player), 2=패.
		const diff = (playerChoice - cpu + 3) % 3;
		if (diff === 0) {
			this.#draws += 1;
			this.#resultText.setText("무승부");
			this.#resultText.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		else if (diff === 1) {
			this.#wins += 1;
			this.#resultText.setText("승리!");
			this.#resultText.setTextColor(Color.createFromHEX(theme.primary));
		}
		else {
			this.#losses += 1;
			this.#resultText.setText("패배");
			this.#resultText.setTextColor(Color.createFromHEX(theme.error));
		}
		this.#round += 1;
		this.refreshScore();
		if (this.#round >= TOTAL_ROUNDS) {
			this.endGame();
		}
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 16;
		const buttonSize = System.Math.floor((contentSize.x - margin * 2 - gap * 2) / 3);

		const scoreH = 60;
		const showH = 200;
		const resultH = 80;
		const buttonsH = buttonSize;
		const resetH = 120;
		const vGap = 32;
		const totalH = scoreH + vGap + showH + vGap + resultH + vGap + buttonsH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#scoreTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + scoreH * 0.5));
		cy += scoreH + vGap;
		this.#showTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + showH * 0.5));
		cy += showH + vGap;
		this.#resultTextNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
		cy += resultH + vGap;
		const buttonsX = (contentSize.x - (buttonSize * 3 + gap * 2)) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(buttonsX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(buttonSize * 3 + gap * 2, buttonSize));
		const fontSize = System.Math.floor(buttonSize * 0.6);
		for (let i = 0; i < this.#buttons.length; ++i) {
			this.#buttons[i].setLocalPosition(Vector2.create(i * (buttonSize + gap), 0));
			this.#buttons[i].setContentSize(Vector2.create(buttonSize, buttonSize));
			this.#buttons[i].setFontSize(fontSize);
		}
		cy += buttonsH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const isWon = this.#wins > this.#losses;
		const score = this.#wins * 100 + this.#draws * 30;
		const app = this.getApp();
		app.showResult({
			isWon,
			title: isWon ? "승리!" : (this.#wins === this.#losses ? "무승부" : "패배"),
			score,
			stats: [
				`승 ${this.#wins}`,
				`무 ${this.#draws}`,
				`패 ${this.#losses}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
