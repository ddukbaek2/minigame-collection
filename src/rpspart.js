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
import { Part, PartId } from "./part.js";
import { createButtonNode, markUseSystemFont } from "./uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "./theme.js";


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
	/** @private @type { Label } */ #label;

	constructor(part, choice) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.choice = choice;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#label = this.addComponent(Label);
		this.#label.setText(ICONS[choice]);
		this.#label.setFontSize(120);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		markUseSystemFont(this.#label);
		this.refreshAppearance();
	}

	refreshAppearance() {
		const theme = getCurrentGameTheme();
		this.#paint.setColor(Color.createFromHEX(theme.surfaceVariant));
	}

	setFontSize(size) { this.#label.setFontSize(size); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onChoice(this.choice);
	}
}


//==============================================================================
// 가위바위보 파트.
//==============================================================================
export class RpsPart extends Part {
	/** @private @type { WorldNode } */ #scoreLabelNode;
	/** @private @type { Label } */ #scoreLabel;
	/** @private @type { WorldNode } */ #showLabelNode;
	/** @private @type { Label } */ #showLabel;
	/** @private @type { WorldNode } */ #resultLabelNode;
	/** @private @type { Label } */ #resultLabel;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { RpsButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
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

		this.#scoreLabelNode = this.makeLabel(40);
		this.addChild(this.#scoreLabelNode);
		this.#scoreLabel = this.#scoreLabelNode.getComponent(Label);

		this.#showLabelNode = this.makeLabel(140);
		this.addChild(this.#showLabelNode);
		this.#showLabel = this.#showLabelNode.getComponent(Label);
		markUseSystemFont(this.#showLabel);

		this.#resultLabelNode = this.makeLabel(56);
		this.addChild(this.#resultLabelNode);
		this.#resultLabel = this.#resultLabelNode.getComponent(Label);

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
		this.#resetButtonLabel = this.#resetButtonNode.getComponent(Label);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	makeLabel(fontSize) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const label = node.addComponent(Label);
		label.setFontSize(fontSize);
		label.setTextAlign("center");
		label.setTextBaseline("middle");
		label.setText("");
		return node;
	}

	enter() { this.resetGame(); this.layout(); }
	onResize() { this.layout(); }
	applyTheme(theme) {}

	applyGameTheme(theme) {
		const bg = this.getBackgroundPaint();
		if (bg) bg.setColor(Color.createFromHEX(theme.background));
		if (this.#scoreLabel) this.#scoreLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#showLabel) this.#showLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resultLabel) this.#resultLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#buttons) b.refreshAppearance();
	}

	resetGame() {
		this.#wins = 0;
		this.#losses = 0;
		this.#draws = 0;
		this.#round = 0;
		this.#isGameOver = false;
		this.#showLabel.setText("✊✌️✋");
		this.#resultLabel.setText("선택하세요");
		this.refreshScore();
	}

	refreshScore() {
		this.#scoreLabel.setText(`${this.#round}/${TOTAL_ROUNDS}    승 ${this.#wins}  무 ${this.#draws}  패 ${this.#losses}`);
	}

	onChoice(playerChoice) {
		if (this.#isGameOver) return;
		const cpu = System.Math.floor(System.Math.random() * 3);
		const theme = getCurrentGameTheme();
		this.#showLabel.setText(`${ICONS[playerChoice]}  vs  ${ICONS[cpu]}`);
		// 승패 판정. (player - cpu + 3) % 3 → 0=무, 1=승(player), 2=패.
		const diff = (playerChoice - cpu + 3) % 3;
		if (diff === 0) {
			this.#draws += 1;
			this.#resultLabel.setText("무승부");
			this.#resultLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		}
		else if (diff === 1) {
			this.#wins += 1;
			this.#resultLabel.setText("승리!");
			this.#resultLabel.setTextColor(Color.createFromHEX(theme.primary));
		}
		else {
			this.#losses += 1;
			this.#resultLabel.setText("패배");
			this.#resultLabel.setTextColor(Color.createFromHEX(theme.error));
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
		this.#scoreLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + scoreH * 0.5));
		cy += scoreH + vGap;
		this.#showLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + showH * 0.5));
		cy += showH + vGap;
		this.#resultLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
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
