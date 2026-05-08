//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/import.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { Paint } from "../libs/vanilla.js/src/core/component/paint.js";
import { UINode } from "../libs/vanilla.js/src/ui/uinode.js";
import { UIScene } from "../libs/vanilla.js/src/ui/uiscene.js";


//==============================================================================
// UIScene + UINode + LayoutSolver 통합 동작 확인용 샘플 씬.
//
// 화면을 다음과 같이 구성한다.
// - 회색 배경: 화면 전체.
// - 빨간 박스: 좌상단. 화면 좌측에서 50, 상단에서 50 떨어짐. 200 x 200.
// - 파란 박스: 우상단. 화면 우측에서 -50, 상단에서 50 떨어짐. 200 x 200.
// - 녹색 박스: 가운데. 화면 중심에 정렬. 너비 = 화면 너비의 0.5, 높이 200.
// - 노란 박스: 빨간 박스 바로 아래. 같은 너비, 화면 하단에서 -50 까지 늘어남.
//
// 사용:
//   import { UITestScene } from "./uitest.js";
//   ...
//   const scene = new UITestScene();
//   engine.run(scene);
//==============================================================================
export class UITestScene extends UIScene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { UINode } */ #backgroundNode;
	/** @private @type { UINode } */ #redNode;
	/** @private @type { UINode } */ #blueNode;
	/** @private @type { UINode } */ #greenNode;
	/** @private @type { UINode } */ #yellowNode;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @virtual
	 * @override
	 */
	create() {
		super.create();
		this.#backgroundNode = this.createColoredNode("background", new Color(0.15, 0.15, 0.18, 1.0));
		this.#redNode = this.createColoredNode("red", new Color(0.90, 0.30, 0.30, 1.0));
		this.#blueNode = this.createColoredNode("blue", new Color(0.30, 0.50, 0.90, 1.0));
		this.#greenNode = this.createColoredNode("green", new Color(0.30, 0.80, 0.45, 1.0));
		this.#yellowNode = this.createColoredNode("yellow", new Color(0.95, 0.80, 0.25, 1.0));

		const root = this.getRoot();
		root.addChild(this.#backgroundNode);
		root.addChild(this.#redNode);
		root.addChild(this.#blueNode);
		root.addChild(this.#greenNode);
		root.addChild(this.#yellowNode);

		this.buildBackgroundConstraints();
		this.buildRedConstraints();
		this.buildBlueConstraints();
		this.buildGreenConstraints();
		this.buildYellowConstraints();
	}

	//==============================================================================
	// 색상 1 개를 갖는 UINode 생성. (Paint 컴포넌트 부착)
	//==============================================================================
	/**
	 * @param { string } name
	 * @param { Color } color
	 * @returns { UINode }
	 */
	createColoredNode(name, color) {
		const node = new UINode();
		node.setName(name);
		const paintComponent = node.addComponent(Paint);
		paintComponent.setColor(color);
		return node;
	}

	//==============================================================================
	// 배경: 화면 전체와 동일한 영역.
	//==============================================================================
	buildBackgroundConstraints() {
		const screenNode = this.getScreenNode();
		const backgroundNode = this.#backgroundNode;
		const leftConstraint = backgroundNode.leftAnchor().equalTo(screenNode.leftAnchor());
		const topConstraint = backgroundNode.topAnchor().equalTo(screenNode.topAnchor());
		const rightConstraint = backgroundNode.rightAnchor().equalTo(screenNode.rightAnchor());
		const bottomConstraint = backgroundNode.bottomAnchor().equalTo(screenNode.bottomAnchor());
		backgroundNode.addConstraint(leftConstraint);
		backgroundNode.addConstraint(topConstraint);
		backgroundNode.addConstraint(rightConstraint);
		backgroundNode.addConstraint(bottomConstraint);
	}

	//==============================================================================
	// 빨간 박스: 좌상단. 200 x 200. 화면 좌측 +50, 상단 +50.
	//==============================================================================
	buildRedConstraints() {
		const screenNode = this.getScreenNode();
		const redNode = this.#redNode;
		const leftConstraint = redNode.leftAnchor().equalTo(screenNode.leftAnchor().add(50));
		const topConstraint = redNode.topAnchor().equalTo(screenNode.topAnchor().add(50));
		const widthConstraint = redNode.widthAnchor().equalTo(200);
		const heightConstraint = redNode.heightAnchor().equalTo(200);
		redNode.addConstraint(leftConstraint);
		redNode.addConstraint(topConstraint);
		redNode.addConstraint(widthConstraint);
		redNode.addConstraint(heightConstraint);
	}

	//==============================================================================
	// 파란 박스: 우상단. 200 x 200. 화면 우측 -50, 상단 +50.
	//==============================================================================
	buildBlueConstraints() {
		const screenNode = this.getScreenNode();
		const blueNode = this.#blueNode;
		const rightConstraint = blueNode.rightAnchor().equalTo(screenNode.rightAnchor().subtract(50));
		const topConstraint = blueNode.topAnchor().equalTo(screenNode.topAnchor().add(50));
		const widthConstraint = blueNode.widthAnchor().equalTo(200);
		const heightConstraint = blueNode.heightAnchor().equalTo(200);
		blueNode.addConstraint(rightConstraint);
		blueNode.addConstraint(topConstraint);
		blueNode.addConstraint(widthConstraint);
		blueNode.addConstraint(heightConstraint);
	}

	//==============================================================================
	// 녹색 박스: 가운데. 너비 = 화면 너비 * 0.5, 높이 = 200. 중앙 정렬.
	//==============================================================================
	buildGreenConstraints() {
		const screenNode = this.getScreenNode();
		const greenNode = this.#greenNode;
		const centerXConstraint = greenNode.centerXAnchor().equalTo(screenNode.centerXAnchor());
		const centerYConstraint = greenNode.centerYAnchor().equalTo(screenNode.centerYAnchor());
		const widthConstraint = greenNode.widthAnchor().equalTo(screenNode.widthAnchor().multiply(0.5));
		const heightConstraint = greenNode.heightAnchor().equalTo(200);
		greenNode.addConstraint(centerXConstraint);
		greenNode.addConstraint(centerYConstraint);
		greenNode.addConstraint(widthConstraint);
		greenNode.addConstraint(heightConstraint);
	}

	//==============================================================================
	// 노란 박스: 빨간 박스 바로 아래. 같은 너비. 화면 하단 -50 까지 늘어남.
	//==============================================================================
	buildYellowConstraints() {
		const screenNode = this.getScreenNode();
		const redNode = this.#redNode;
		const yellowNode = this.#yellowNode;
		const leftConstraint = yellowNode.leftAnchor().equalTo(redNode.leftAnchor());
		const widthConstraint = yellowNode.widthAnchor().equalTo(redNode.widthAnchor());
		const topConstraint = yellowNode.topAnchor().equalTo(redNode.bottomAnchor().add(20));
		const bottomConstraint = yellowNode.bottomAnchor().equalTo(screenNode.bottomAnchor().subtract(50));
		yellowNode.addConstraint(leftConstraint);
		yellowNode.addConstraint(widthConstraint);
		yellowNode.addConstraint(topConstraint);
		yellowNode.addConstraint(bottomConstraint);
	}
}
