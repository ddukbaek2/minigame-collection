//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../../libs/vanilla.js/src/base/vector2.js";
import { Pivot } from "../../libs/vanilla.js/src/base/pivot.js";
import { Color } from "../../libs/vanilla.js/src/base/color.js";
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";
import { Paint } from "../../libs/vanilla.js/src/core/component/paint.js";
import { Label } from "../../libs/vanilla.js/src/core/component/label.js";
import { Part, PartId } from "../part.js";
import { createButtonNode } from "../uihelper.js";
import { getCurrentGameTheme, addGameThemeChangeListener } from "../theme.js";


//==============================================================================
// 게임 상수.
//==============================================================================
const TOTAL_FLIPS = 10;
const STARTING_CHIPS = 100;
const BET_AMOUNT = 10;
const COIN_SIZE = 360;
const COIN_RIM_THICKNESS = 18;          // 외곽 테두리 두께.
const COIN_HEAD_RIM_COLOR = "#92400e";  // 앞면 림 (어두운 황동).
const COIN_HEAD_FACE_COLOR = "#fbbf24"; // 앞면 (밝은 금).
const COIN_TAIL_RIM_COLOR = "#475569";  // 뒷면 림 (어두운 회색).
const COIN_TAIL_FACE_COLOR = "#94a3b8"; // 뒷면 (은색).
const COIN_IDLE_RIM_COLOR = "#7c5e1e";  // 대기 상태 림.
const COIN_IDLE_FACE_COLOR = "#eab308"; // 대기 상태 (현재 황금색).
const COIN_FACE_TEXT_COLOR = "#1f2937";


//==============================================================================
// 선택 버튼.
//==============================================================================
class CoinButton extends WorldNode {
	/** @type { string } */ choice;
	/** @private @type { CoinFlipPart } */ #part;
	/** @private @type { Paint } */ #paint;
	/** @private @type { Label } */ #label;

	constructor(part, choice, text) {
		super();
		this.setPivot(Pivot.topLeft);
		this.setAnchor(Pivot.topLeft);
		this.setInteractable(true);
		this.choice = choice;
		this.#part = part;
		this.#paint = this.addComponent(Paint);
		this.#paint.setRoundSize(20);
		this.#label = this.addComponent(Label);
		this.#label.setText(text);
		this.#label.setFontSize(80);
		this.#label.setTextAlign("center");
		this.#label.setTextBaseline("middle");
		this.refreshAppearance();
	}

	refreshAppearance() {
		const isHead = this.choice === "head";
		this.#paint.setColor(Color.createFromHEX(isHead ? "#eab308" : "#a16207"));
		this.#label.setTextColor(Color.createFromHEX("#ffffff"));
	}

	setFontSize(s) { this.#label.setFontSize(s); }

	touchRelease(viewInputPosition) {
		if (!this.contains(viewInputPosition)) return;
		this.#part.onChoice(this.choice);
	}
}


//==============================================================================
// 동전 베팅 파트.
//==============================================================================
export class CoinFlipPart extends Part {
	/** @private @type { WorldNode } */ #infoLabelNode;
	/** @private @type { Label } */ #infoLabel;
	/** @private @type { WorldNode } */ #coinNode;
	/** @private @type { Paint } */ #coinRimPaint;
	/** @private @type { WorldNode } */ #coinFaceNode;
	/** @private @type { Paint } */ #coinFacePaint;
	/** @private @type { Label } */ #coinLabel;
	/** @private @type { WorldNode } */ #resultLabelNode;
	/** @private @type { Label } */ #resultLabel;
	/** @private @type { WorldNode } */ #buttonsNode;
	/** @private @type { CoinButton[] } */ #buttons;
	/** @private @type { WorldNode } */ #resetButtonNode;
	/** @private @type { Paint } */ #resetButtonPaint;
	/** @private @type { Label } */ #resetButtonLabel;
	/** @private @type { number } */ #chips;
	/** @private @type { number } */ #flips;
	/** @private @type { boolean } */ #isStarted;
	/** @private @type { boolean } */ #isGameOver;

	constructor() {
		super();
		this.#buttons = [];
		this.#chips = STARTING_CHIPS;
		this.#flips = 0;
		this.#isStarted = false;
		this.#isGameOver = false;
		addGameThemeChangeListener((theme) => this.applyGameTheme(theme));
	}

	getPartId() { return PartId.coinFlip; }
	getNavigationTitle() { return "동전 베팅"; }
	getNavigationBackIcon() { return "❌"; }

	shouldConfirmExit() { return this.#isStarted && !this.#isGameOver; }
	getExitConfirmMessage() { return "현재 게임을 그만두시겠습니까?"; }

	onBuild() {
		this.setupBackground();

		this.#infoLabelNode = this.makeLabel(40);
		this.addChild(this.#infoLabelNode);
		this.#infoLabel = this.#infoLabelNode.getComponent(Label);

		// 동전: 외곽 림(어두운 색) + 안쪽 face(밝은 색) + 텍스트. 두 Paint 모두
		// roundSize 를 자기 크기의 절반으로 설정해 진짜 원형이 되게 한다.
		this.#coinNode = new WorldNode();
		this.#coinNode.setPivot(Pivot.middleCenter);
		this.#coinNode.setAnchor(Pivot.topLeft);
		this.#coinRimPaint = this.#coinNode.addComponent(Paint);
		this.#coinRimPaint.setColor(Color.createFromHEX(COIN_IDLE_RIM_COLOR));
		this.addChild(this.#coinNode);

		this.#coinFaceNode = new WorldNode();
		this.#coinFaceNode.setPivot(Pivot.middleCenter);
		this.#coinFaceNode.setAnchor(Pivot.topLeft);
		this.#coinFacePaint = this.#coinFaceNode.addComponent(Paint);
		this.#coinFacePaint.setColor(Color.createFromHEX(COIN_IDLE_FACE_COLOR));
		this.#coinLabel = this.#coinFaceNode.addComponent(Label);
		this.#coinLabel.setText("?");
		this.#coinLabel.setFontSize(180);
		this.#coinLabel.setTextAlign("center");
		this.#coinLabel.setTextBaseline("middle");
		this.#coinLabel.setTextColor(Color.createFromHEX(COIN_FACE_TEXT_COLOR));
		this.#coinNode.addChild(this.#coinFaceNode);

		this.#resultLabelNode = this.makeLabel(48);
		this.addChild(this.#resultLabelNode);
		this.#resultLabel = this.#resultLabelNode.getComponent(Label);

		this.#buttonsNode = new WorldNode();
		this.#buttonsNode.setPivot(Pivot.topLeft);
		this.#buttonsNode.setAnchor(Pivot.topLeft);
		this.addChild(this.#buttonsNode);
		this.#buttons.push(new CoinButton(this, "head", "앞면"));
		this.#buttons.push(new CoinButton(this, "tail", "뒷면"));
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
		this.#resetButtonLabel = this.#resetButtonNode.getComponent(Label);
		this.addChild(this.#resetButtonNode);

		this.applyGameTheme(getCurrentGameTheme());
	}

	makeLabel(s) {
		const node = new WorldNode();
		node.setPivot(Pivot.middleCenter);
		node.setAnchor(Pivot.topLeft);
		const label = node.addComponent(Label);
		label.setFontSize(s);
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
		if (this.#infoLabel) this.#infoLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resultLabel) this.#resultLabel.setTextColor(Color.createFromHEX(theme.onBackground));
		if (this.#resetButtonPaint) this.#resetButtonPaint.setColor(Color.createFromHEX(theme.primary));
		if (this.#resetButtonLabel) this.#resetButtonLabel.setTextColor(Color.createFromHEX(theme.onPrimary));
		for (const b of this.#buttons) b.refreshAppearance();
	}

	//==============================================================================
	// 동전 색/텍스트를 상태에 맞게 갱신. ("idle" / "head" / "tail")
	//==============================================================================
	setCoinFace(state) {
		let rimHex, faceHex, text;
		if (state === "head") {
			rimHex = COIN_HEAD_RIM_COLOR;
			faceHex = COIN_HEAD_FACE_COLOR;
			text = "앞";
		}
		else if (state === "tail") {
			rimHex = COIN_TAIL_RIM_COLOR;
			faceHex = COIN_TAIL_FACE_COLOR;
			text = "뒤";
		}
		else {
			rimHex = COIN_IDLE_RIM_COLOR;
			faceHex = COIN_IDLE_FACE_COLOR;
			text = "?";
		}
		this.#coinRimPaint.setColor(Color.createFromHEX(rimHex));
		this.#coinFacePaint.setColor(Color.createFromHEX(faceHex));
		this.#coinLabel.setText(text);
	}

	resetGame() {
		this.#chips = STARTING_CHIPS;
		this.#flips = 0;
		this.#isStarted = true;
		this.#isGameOver = false;
		this.setCoinFace("idle");
		this.#resultLabel.setText(`${BET_AMOUNT} 칩 베팅 (x2)`);
		this.refreshInfo();
	}

	refreshInfo() {
		this.#infoLabel.setText(`칩: ${this.#chips}    플립 ${this.#flips}/${TOTAL_FLIPS}`);
	}

	onChoice(choice) {
		if (this.#isGameOver) return;
		if (this.#chips < BET_AMOUNT) return;
		this.#chips -= BET_AMOUNT;
		const result = System.Math.random() < 0.5 ? "head" : "tail";
		this.setCoinFace(result);
		const theme = getCurrentGameTheme();
		const win = (choice === result);
		if (win) {
			this.#chips += BET_AMOUNT * 2;
			this.#resultLabel.setText(`${result === "head" ? "앞면" : "뒷면"}!  +${BET_AMOUNT} 칩`);
			this.#resultLabel.setTextColor(Color.createFromHEX(theme.primary));
		}
		else {
			this.#resultLabel.setText(`${result === "head" ? "앞면" : "뒷면"}  -${BET_AMOUNT} 칩`);
			this.#resultLabel.setTextColor(Color.createFromHEX(theme.error));
		}
		this.#flips += 1;
		this.refreshInfo();
		if (this.#flips >= TOTAL_FLIPS || this.#chips < BET_AMOUNT) {
			this.endGame();
		}
	}

	layout() {
		const contentSize = this.getContentSize();
		const margin = 40;
		const gap = 16;
		const buttonW = System.Math.floor((contentSize.x - margin * 2 - gap) / 2);
		const buttonH = 220;
		const coinSize = COIN_SIZE;

		const infoH = 60;
		const resultH = 80;
		const resetH = 120;
		const vGap = 32;
		const totalH = infoH + vGap + coinSize + vGap + resultH + vGap + buttonH + vGap + resetH;
		const top = System.Math.max((contentSize.y - totalH) * 0.5, 0);

		let cy = top;
		this.#infoLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + infoH * 0.5));
		cy += infoH + vGap;
		this.#coinNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + coinSize * 0.5));
		this.#coinNode.setContentSize(Vector2.create(coinSize, coinSize));
		// 진짜 원형이 되도록 roundSize = 반지름.
		this.#coinRimPaint.setRoundSize(coinSize * 0.5);
		const faceSize = coinSize - COIN_RIM_THICKNESS * 2;
		// 림 안쪽에 face 를 가운데 정렬.
		this.#coinFaceNode.setLocalPosition(Vector2.create(coinSize * 0.5, coinSize * 0.5));
		this.#coinFaceNode.setContentSize(Vector2.create(faceSize, faceSize));
		this.#coinFacePaint.setRoundSize(faceSize * 0.5);
		// 라벨 폰트는 face 크기에 비례.
		this.#coinLabel.setFontSize(System.Math.floor(faceSize * 0.55));
		cy += coinSize + vGap;
		this.#resultLabelNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resultH * 0.5));
		cy += resultH + vGap;
		const btnX = (contentSize.x - (buttonW * 2 + gap)) * 0.5;
		this.#buttonsNode.setLocalPosition(Vector2.create(btnX, cy));
		this.#buttonsNode.setContentSize(Vector2.create(buttonW * 2 + gap, buttonH));
		for (let i = 0; i < this.#buttons.length; ++i) {
			this.#buttons[i].setLocalPosition(Vector2.create(i * (buttonW + gap), 0));
			this.#buttons[i].setContentSize(Vector2.create(buttonW, buttonH));
			this.#buttons[i].setFontSize(80);
		}
		cy += buttonH + vGap;
		this.#resetButtonNode.setLocalPosition(Vector2.create(contentSize.x * 0.5, cy + resetH * 0.5));
	}

	endGame() {
		this.#isGameOver = true;
		const profit = this.#chips - STARTING_CHIPS;
		const isWon = profit > 0;
		const app = this.getApp();
		app.showResult({
			isWon,
			title: isWon ? "수익!" : (profit === 0 ? "본전" : "손실"),
			score: System.Math.max(0, this.#chips),
			stats: [
				`최종 칩: ${this.#chips}`,
				`수익: ${profit >= 0 ? "+" : ""}${profit}`,
			],
			onRetry: () => { this.resetGame(); },
			onExit: () => { app.popPart(); },
		});
	}
}
