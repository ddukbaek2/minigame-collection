//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Color, Paint, UINode, UIScene } from "../libs/vanilla.js/import.js";


//==============================================================================
// UIScene + UINode + LayoutSolver 종합 동작 샘플.
//
// "복잡한 UI 를 단순하게" 를 보여주기 위한 샘플.
// - 좌표 계산 한 줄도 없이, 부모의 anchor 만 참조해서 자식 영역을 표현한다.
// - 화면 크기 / 노치 인셋이 바뀌면 모든 영역이 자동으로 따라간다.
// - viewSize / safeArea 동기화는 UIScene 이 처리하므로 샘플에서는 의식하지 않는다.
//
// 화면 계층:
//   safeAreaLayoutGuide
//     ├ background       (safeArea 전체를 덮는 배경판)
//     ├ header           (상단 + 고정 높이 100)
//     ├ footer           (하단 + 고정 높이 80)
//     └ content          (header / footer 사이 가변 높이)
//        ├ sidebar       (좌측 + 고정 너비 220)
//        └ main          (sidebar 우측 + 우측 끝까지 가변)
//           ├ card1 / card2  (상단 2 칸)
//           └ card3 / card4  (하단 2 칸)  // 카드 사이 gap = 16, 외곽 padding = 24
//==============================================================================
export class UITestScene extends UIScene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { UINode } */ #backgroundNode;
	/** @private @type { UINode } */ #headerNode;
	/** @private @type { UINode } */ #footerNode;
	/** @private @type { UINode } */ #contentNode;
	/** @private @type { UINode } */ #sidebarNode;
	/** @private @type { UINode } */ #mainNode;
	/** @private @type { UINode } */ #cardNode1;
	/** @private @type { UINode } */ #cardNode2;
	/** @private @type { UINode } */ #cardNode3;
	/** @private @type { UINode } */ #cardNode4;


	//==============================================================================
	// 생성. 노드 생성 → 트리 구성 → 영역별 제약 작성.
	//==============================================================================
	/**
	 * @override
	 */
	create() {
		super.create();

		this.#backgroundNode = this.createColoredNode("background", new Color(0.10, 0.10, 0.12, 1.0));
		this.#headerNode     = this.createColoredNode("header",     new Color(0.20, 0.22, 0.28, 1.0));
		this.#footerNode     = this.createColoredNode("footer",     new Color(0.20, 0.22, 0.28, 1.0));
		this.#contentNode    = this.createColoredNode("content",    new Color(0.14, 0.14, 0.18, 1.0));
		this.#sidebarNode    = this.createColoredNode("sidebar",    new Color(0.30, 0.40, 0.65, 1.0));
		this.#mainNode       = this.createColoredNode("main",       new Color(0.16, 0.18, 0.22, 1.0));
		this.#cardNode1      = this.createColoredNode("card1",      new Color(0.85, 0.30, 0.30, 1.0));
		this.#cardNode2      = this.createColoredNode("card2",      new Color(0.30, 0.80, 0.45, 1.0));
		this.#cardNode3      = this.createColoredNode("card3",      new Color(0.95, 0.80, 0.25, 1.0));
		this.#cardNode4      = this.createColoredNode("card4",      new Color(0.50, 0.40, 0.85, 1.0));

		// 1 계층: root 직계 (background / header / footer / content).
		const root = this.getRoot();
		root.addChild(this.#backgroundNode);
		root.addChild(this.#headerNode);
		root.addChild(this.#footerNode);
		root.addChild(this.#contentNode);

		// 2 계층: content 안 (sidebar / main).
		this.#contentNode.addChild(this.#sidebarNode);
		this.#contentNode.addChild(this.#mainNode);

		// 3 계층: main 안 (card1 ~ card4).
		this.#mainNode.addChild(this.#cardNode1);
		this.#mainNode.addChild(this.#cardNode2);
		this.#mainNode.addChild(this.#cardNode3);
		this.#mainNode.addChild(this.#cardNode4);

		this.buildBackgroundConstraints();
		this.buildHeaderConstraints();
		this.buildFooterConstraints();
		this.buildContentConstraints();
		this.buildSidebarConstraints();
		this.buildMainConstraints();
		this.buildCardGridConstraints();
	}

	//==============================================================================
	// 단색 UINode 생성. (Paint 컴포넌트 부착)
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
	// 4 면 고정 헬퍼. node 의 left/top/right/bottom 을 parentNode 의 동일 변에
	// padding 만큼 들여 쓰도록 제약을 건다.
	//==============================================================================
	/**
	 * @param { UINode } node
	 * @param { UINode } parentNode
	 * @param { number } [padding]
	 */
	pinAllSides(node, parentNode, padding) {
		const inset = padding || 0;
		node.addConstraint(node.leftAnchor()  .equalTo(parentNode.leftAnchor()  .add(inset)));
		node.addConstraint(node.topAnchor()   .equalTo(parentNode.topAnchor()   .add(inset)));
		node.addConstraint(node.rightAnchor() .equalTo(parentNode.rightAnchor() .subtract(inset)));
		node.addConstraint(node.bottomAnchor().equalTo(parentNode.bottomAnchor().subtract(inset)));
	}

	//==============================================================================
	// 배경: safeArea 전체.
	//==============================================================================
	buildBackgroundConstraints() {
		const safeAreaGuide = this.getSafeAreaLayoutGuide();
		this.pinAllSides(this.#backgroundNode, safeAreaGuide);
	}

	//==============================================================================
	// 헤더: safeArea 좌우 가득 + 상단에 고정 높이 100.
	//==============================================================================
	buildHeaderConstraints() {
		const safeAreaGuide = this.getSafeAreaLayoutGuide();
		const headerNode = this.#headerNode;
		headerNode.addConstraint(headerNode.leftAnchor()  .equalTo(safeAreaGuide.leftAnchor()));
		headerNode.addConstraint(headerNode.topAnchor()   .equalTo(safeAreaGuide.topAnchor()));
		headerNode.addConstraint(headerNode.rightAnchor() .equalTo(safeAreaGuide.rightAnchor()));
		headerNode.addConstraint(headerNode.heightAnchor().equalTo(100));
	}

	//==============================================================================
	// 풋터: safeArea 좌우 가득 + 하단에 고정 높이 80.
	//==============================================================================
	buildFooterConstraints() {
		const safeAreaGuide = this.getSafeAreaLayoutGuide();
		const footerNode = this.#footerNode;
		footerNode.addConstraint(footerNode.leftAnchor()  .equalTo(safeAreaGuide.leftAnchor()));
		footerNode.addConstraint(footerNode.bottomAnchor().equalTo(safeAreaGuide.bottomAnchor()));
		footerNode.addConstraint(footerNode.rightAnchor() .equalTo(safeAreaGuide.rightAnchor()));
		footerNode.addConstraint(footerNode.heightAnchor().equalTo(80));
	}

	//==============================================================================
	// 본문: 헤더 바닥과 풋터 천장 사이를 채움. 좌우는 safeArea.
	//==============================================================================
	buildContentConstraints() {
		const safeAreaGuide = this.getSafeAreaLayoutGuide();
		const contentNode = this.#contentNode;
		contentNode.addConstraint(contentNode.leftAnchor()  .equalTo(safeAreaGuide.leftAnchor()));
		contentNode.addConstraint(contentNode.rightAnchor() .equalTo(safeAreaGuide.rightAnchor()));
		contentNode.addConstraint(contentNode.topAnchor()   .equalTo(this.#headerNode.bottomAnchor()));
		contentNode.addConstraint(contentNode.bottomAnchor().equalTo(this.#footerNode.topAnchor()));
	}

	//==============================================================================
	// 사이드바: 본문 좌측 + 너비 220.
	//==============================================================================
	buildSidebarConstraints() {
		const sidebarNode = this.#sidebarNode;
		const contentNode = this.#contentNode;
		sidebarNode.addConstraint(sidebarNode.leftAnchor()  .equalTo(contentNode.leftAnchor()));
		sidebarNode.addConstraint(sidebarNode.topAnchor()   .equalTo(contentNode.topAnchor()));
		sidebarNode.addConstraint(sidebarNode.bottomAnchor().equalTo(contentNode.bottomAnchor()));
		sidebarNode.addConstraint(sidebarNode.widthAnchor() .equalTo(220));
	}

	//==============================================================================
	// 메인: 사이드바 우측부터 본문 우측 끝까지 채움.
	//==============================================================================
	buildMainConstraints() {
		const mainNode = this.#mainNode;
		const contentNode = this.#contentNode;
		mainNode.addConstraint(mainNode.leftAnchor()  .equalTo(this.#sidebarNode.rightAnchor()));
		mainNode.addConstraint(mainNode.rightAnchor() .equalTo(contentNode.rightAnchor()));
		mainNode.addConstraint(mainNode.topAnchor()   .equalTo(contentNode.topAnchor()));
		mainNode.addConstraint(mainNode.bottomAnchor().equalTo(contentNode.bottomAnchor()));
	}

	//==============================================================================
	// 카드 2x2 그리드. 외곽 padding 24, 카드 사이 gap 16.
	// - main 의 centerX / centerY 를 분할점으로 사용 → 4 칸이 자동으로 균등 분할된다.
	//==============================================================================
	buildCardGridConstraints() {
		const mainNode = this.#mainNode;
		const padding = 24;
		const gap = 16;
		const halfGap = gap / 2;

		const centerXAnchor = mainNode.centerXAnchor();
		const centerYAnchor = mainNode.centerYAnchor();

		const cardNode1 = this.#cardNode1;
		cardNode1.addConstraint(cardNode1.leftAnchor()  .equalTo(mainNode.leftAnchor().add(padding)));
		cardNode1.addConstraint(cardNode1.topAnchor()   .equalTo(mainNode.topAnchor() .add(padding)));
		cardNode1.addConstraint(cardNode1.rightAnchor() .equalTo(centerXAnchor.subtract(halfGap)));
		cardNode1.addConstraint(cardNode1.bottomAnchor().equalTo(centerYAnchor.subtract(halfGap)));

		const cardNode2 = this.#cardNode2;
		cardNode2.addConstraint(cardNode2.leftAnchor()  .equalTo(centerXAnchor.add(halfGap)));
		cardNode2.addConstraint(cardNode2.topAnchor()   .equalTo(mainNode.topAnchor().add(padding)));
		cardNode2.addConstraint(cardNode2.rightAnchor() .equalTo(mainNode.rightAnchor().subtract(padding)));
		cardNode2.addConstraint(cardNode2.bottomAnchor().equalTo(centerYAnchor.subtract(halfGap)));

		const cardNode3 = this.#cardNode3;
		cardNode3.addConstraint(cardNode3.leftAnchor()  .equalTo(mainNode.leftAnchor().add(padding)));
		cardNode3.addConstraint(cardNode3.topAnchor()   .equalTo(centerYAnchor.add(halfGap)));
		cardNode3.addConstraint(cardNode3.rightAnchor() .equalTo(centerXAnchor.subtract(halfGap)));
		cardNode3.addConstraint(cardNode3.bottomAnchor().equalTo(mainNode.bottomAnchor().subtract(padding)));

		const cardNode4 = this.#cardNode4;
		cardNode4.addConstraint(cardNode4.leftAnchor()  .equalTo(centerXAnchor.add(halfGap)));
		cardNode4.addConstraint(cardNode4.topAnchor()   .equalTo(centerYAnchor.add(halfGap)));
		cardNode4.addConstraint(cardNode4.rightAnchor() .equalTo(mainNode.rightAnchor().subtract(padding)));
		cardNode4.addConstraint(cardNode4.bottomAnchor().equalTo(mainNode.bottomAnchor().subtract(padding)));
	}
}