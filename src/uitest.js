//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Color, Paint, UINode, UIScene, ViewScaleMode } from "../libs/vanilla.js/import.js";


//==============================================================================
// UIScene + UINode + LayoutSolver 의 강점을 보여주는 샘플.
//
// 명령형 좌표 기반 UI (예: NodeLayout + WorldNode + setLocalPosition) 로는
// 자연스럽게 표현하기 어려운 케이스들을 한 화면에 모은다.
//
//   1. 비율 분할:   parent.height * 0.12  같이 부모 비율로 영역을 자동 분할.
//   2. 형제 의존:   "B.left = A.right + gap" / "B.width = A.width".
//                   → N 등분이 명시 좌표 0 개로 표현된다.
//   3. 양방향 추종: viewSize / safeAreaInsets 변화에 모든 영역이 자동 재계산.
//
// 화면 계층:
//   safeAreaLayoutGuide
//     ├ background
//     ├ header   (고정 높이 100)
//     ├ body     (header / footer 사이를 채움)
//     │  ├ sidebar (너비 = body 의 22 %)
//     │  └ main    (너비 = body 의 78 %)
//     │     └ card1 ~ card5  (가로 균등 분할, 형제 의존)
//     └ footer   (고정 높이 80)
//==============================================================================
export class UITestScene extends UIScene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { UINode } */ #backgroundNode;
	/** @private @type { UINode } */ #headerNode;
	/** @private @type { UINode } */ #bodyNode;
	/** @private @type { UINode } */ #footerNode;
	/** @private @type { UINode } */ #sidebarNode;
	/** @private @type { UINode } */ #mainNode;
	/** @private @type { UINode[] } */ #cardNodes;

	//==============================================================================
	// 생성. 노드 생성 → 트리 구성 → 영역별 제약 작성.
	//==============================================================================
	/**
	 * @override
	 */
	create() {
		super.create();
		this.setViewScaleMode(ViewScaleMode.none);

		this.#backgroundNode = this.createColoredNode("background", new Color(0.10, 0.10, 0.12, 1.0));
		this.#headerNode     = this.createColoredNode("header",     new Color(0.20, 0.22, 0.28, 1.0));
		this.#bodyNode       = this.createColoredNode("body",       new Color(0.14, 0.14, 0.18, 1.0));
		this.#footerNode     = this.createColoredNode("footer",     new Color(0.20, 0.22, 0.28, 1.0));
		this.#sidebarNode    = this.createColoredNode("sidebar",    new Color(0.30, 0.40, 0.65, 1.0));
		this.#mainNode       = this.createColoredNode("main",       new Color(0.16, 0.18, 0.22, 1.0));

		const cardColors = [
			new Color(0.85, 0.30, 0.30, 1.0),
			new Color(0.95, 0.65, 0.25, 1.0),
			new Color(0.95, 0.85, 0.30, 1.0),
			new Color(0.30, 0.80, 0.45, 1.0),
			new Color(0.40, 0.55, 0.95, 1.0),
		];
		this.#cardNodes = cardColors.map((color, index) => this.createColoredNode(`card${index + 1}`, color));

		const root = this.getRoot();
		const safeAreaGuide = this.getSafeAreaLayoutGuide();

		// 1 계층.
		root.addChild(this.#backgroundNode);
		root.addChild(this.#headerNode);
		root.addChild(this.#bodyNode);
		root.addChild(this.#footerNode);

		// 2 계층.
		this.#bodyNode.addChild(this.#sidebarNode);
		this.#bodyNode.addChild(this.#mainNode);

		// 3 계층.
		for (const cardNode of this.#cardNodes) {
			this.#mainNode.addChild(cardNode);
		}

		// 배경 = safeArea 전체.
		this.pinAllSides(this.#backgroundNode, safeAreaGuide);

		// 헤더 / 풋터: 고정 높이. 본문: 사이를 채움.
		this.pinTopBar(this.#headerNode, safeAreaGuide, 100);
		this.pinBottomBar(this.#footerNode, safeAreaGuide, 80);
		this.pinHorizontalEdges(this.#bodyNode, safeAreaGuide);
		const headerBottomAnchor = this.#headerNode.bottomAnchor;
		const footerTopAnchor = this.#footerNode.topAnchor;
		const bodyTopAnchor = this.#bodyNode.topAnchor;
		const bodyBottomAnchor = this.#bodyNode.bottomAnchor;
		const bodyTopConstraint = bodyTopAnchor.equalTo(headerBottomAnchor);
		const bodyBottomConstraint = bodyBottomAnchor.equalTo(footerTopAnchor);
		this.#bodyNode.addConstraint(bodyTopConstraint);
		this.#bodyNode.addConstraint(bodyBottomConstraint);

		// 가로 비율 분할: 사이드바(22%) + 메인(78%).
		this.splitHorizontal(this.#bodyNode, [this.#sidebarNode, this.#mainNode], [0.22, 0.78]);

		// 카드 5장 가로 균등 분할 (형제 의존 + 동일 너비).
		this.distributeHorizontally(this.#mainNode, this.#cardNodes, 16, 12);
		for (const cardNode of this.#cardNodes) {
			this.pinVerticalEdges(cardNode, this.#mainNode, 16);
		}
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
	// 4 면 고정. node 의 모든 변을 parentNode 의 동일 변에 padding 만큼 들여 쓴다.
	//==============================================================================
	/**
	 * @param { UINode } node
	 * @param { UINode } parentNode
	 * @param { number } [padding]
	 */
	pinAllSides(node, parentNode, padding) {
		const inset = padding || 0;

		const parentLeftAnchor = parentNode.leftAnchor;
		const leftOffsetExpression = parentLeftAnchor.add(inset);
		const nodeLeftAnchor = node.leftAnchor;
		const leftConstraint = nodeLeftAnchor.equalTo(leftOffsetExpression);
		node.addConstraint(leftConstraint);

		const parentTopAnchor = parentNode.topAnchor;
		const topOffsetExpression = parentTopAnchor.add(inset);
		const nodeTopAnchor = node.topAnchor;
		const topConstraint = nodeTopAnchor.equalTo(topOffsetExpression);
		node.addConstraint(topConstraint);

		const parentRightAnchor = parentNode.rightAnchor;
		const rightOffsetExpression = parentRightAnchor.subtract(inset);
		const nodeRightAnchor = node.rightAnchor;
		const rightConstraint = nodeRightAnchor.equalTo(rightOffsetExpression);
		node.addConstraint(rightConstraint);

		const parentBottomAnchor = parentNode.bottomAnchor;
		const bottomOffsetExpression = parentBottomAnchor.subtract(inset);
		const nodeBottomAnchor = node.bottomAnchor;
		const bottomConstraint = nodeBottomAnchor.equalTo(bottomOffsetExpression);
		node.addConstraint(bottomConstraint);
	}

	//==============================================================================
	// 좌우만 부모와 동일 변에 padding 들여 쓴다.
	//==============================================================================
	/**
	 * @param { UINode } node
	 * @param { UINode } parentNode
	 * @param { number } [padding]
	 */
	pinHorizontalEdges(node, parentNode, padding) {
		const inset = padding || 0;

		const parentLeftAnchor = parentNode.leftAnchor;
		const leftOffsetExpression = parentLeftAnchor.add(inset);
		const nodeLeftAnchor = node.leftAnchor;
		const leftConstraint = nodeLeftAnchor.equalTo(leftOffsetExpression);
		node.addConstraint(leftConstraint);

		const parentRightAnchor = parentNode.rightAnchor;
		const rightOffsetExpression = parentRightAnchor.subtract(inset);
		const nodeRightAnchor = node.rightAnchor;
		const rightConstraint = nodeRightAnchor.equalTo(rightOffsetExpression);
		node.addConstraint(rightConstraint);
	}

	//==============================================================================
	// 상하만 부모와 동일 변에 padding 들여 쓴다.
	//==============================================================================
	/**
	 * @param { UINode } node
	 * @param { UINode } parentNode
	 * @param { number } [padding]
	 */
	pinVerticalEdges(node, parentNode, padding) {
		const inset = padding || 0;

		const parentTopAnchor = parentNode.topAnchor;
		const topOffsetExpression = parentTopAnchor.add(inset);
		const nodeTopAnchor = node.topAnchor;
		const topConstraint = nodeTopAnchor.equalTo(topOffsetExpression);
		node.addConstraint(topConstraint);

		const parentBottomAnchor = parentNode.bottomAnchor;
		const bottomOffsetExpression = parentBottomAnchor.subtract(inset);
		const nodeBottomAnchor = node.bottomAnchor;
		const bottomConstraint = nodeBottomAnchor.equalTo(bottomOffsetExpression);
		node.addConstraint(bottomConstraint);
	}

	//==============================================================================
	// 상단 고정 높이 바. 좌우 풀폭 + 상단 + 고정 높이.
	//==============================================================================
	/**
	 * @param { UINode } node
	 * @param { UINode } parentNode
	 * @param { number } height
	 */
	pinTopBar(node, parentNode, height) {
		this.pinHorizontalEdges(node, parentNode);

		const parentTopAnchor = parentNode.topAnchor;
		const nodeTopAnchor = node.topAnchor;
		const topConstraint = nodeTopAnchor.equalTo(parentTopAnchor);
		node.addConstraint(topConstraint);

		const nodeHeightAnchor = node.heightAnchor;
		const heightConstraint = nodeHeightAnchor.equalTo(height);
		node.addConstraint(heightConstraint);
	}

	//==============================================================================
	// 하단 고정 높이 바. 좌우 풀폭 + 하단 + 고정 높이.
	//==============================================================================
	/**
	 * @param { UINode } node
	 * @param { UINode } parentNode
	 * @param { number } height
	 */
	pinBottomBar(node, parentNode, height) {
		this.pinHorizontalEdges(node, parentNode);

		const parentBottomAnchor = parentNode.bottomAnchor;
		const nodeBottomAnchor = node.bottomAnchor;
		const bottomConstraint = nodeBottomAnchor.equalTo(parentBottomAnchor);
		node.addConstraint(bottomConstraint);

		const nodeHeightAnchor = node.heightAnchor;
		const heightConstraint = nodeHeightAnchor.equalTo(height);
		node.addConstraint(heightConstraint);
	}

	//==============================================================================
	// 부모를 가로 방향으로 비율 분할.
	// - 각 자식의 width = parent.width * ratios[i].
	// - 자식의 left = 이전 자식의 right (첫 번째는 parent.left).
	// - 상하는 부모와 동일.
	//==============================================================================
	/**
	 * @param { UINode } parentNode
	 * @param { UINode[] } nodes
	 * @param { number[] } ratios
	 */
	splitHorizontal(parentNode, nodes, ratios) {
		for (let index = 0; index < nodes.length; index++) {
			const node = nodes[index];
			this.pinVerticalEdges(node, parentNode);

			const parentWidthAnchor = parentNode.widthAnchor;
			const widthExpression = parentWidthAnchor.multiply(ratios[index]);
			const nodeWidthAnchor = node.widthAnchor;
			const widthConstraint = nodeWidthAnchor.equalTo(widthExpression);
			node.addConstraint(widthConstraint);

			const nodeLeftAnchor = node.leftAnchor;
			if (index === 0) {
				const parentLeftAnchor = parentNode.leftAnchor;
				const leftConstraint = nodeLeftAnchor.equalTo(parentLeftAnchor);
				node.addConstraint(leftConstraint);
			}
			else {
				const previousNode = nodes[index - 1];
				const previousRightAnchor = previousNode.rightAnchor;
				const leftConstraint = nodeLeftAnchor.equalTo(previousRightAnchor);
				node.addConstraint(leftConstraint);
			}
		}
	}

	//==============================================================================
	// 부모 안에 노드들을 가로 균등 분할 (형제 의존).
	// - 첫 노드의 left = parent.left + padding.
	// - 마지막 노드의 right = parent.right - padding.
	// - 노드 사이 = gap.
	// - 모든 노드의 width = 첫 노드의 width → 솔버가 균등 너비를 자동 결정.
	//   (NodeLayout + setLocalPosition 으로는 부모 너비가 변할 때마다 재계산을 직접 해야 한다.)
	//==============================================================================
	/**
	 * @param { UINode } parentNode
	 * @param { UINode[] } nodes
	 * @param { number } padding
	 * @param { number } gap
	 */
	distributeHorizontally(parentNode, nodes, padding, gap) {
		const firstNode = nodes[0];
		const lastNode = nodes[nodes.length - 1];

		const parentLeftAnchor = parentNode.leftAnchor;
		const firstLeftExpression = parentLeftAnchor.add(padding);
		const firstLeftAnchor = firstNode.leftAnchor;
		const firstLeftConstraint = firstLeftAnchor.equalTo(firstLeftExpression);
		firstNode.addConstraint(firstLeftConstraint);

		for (let index = 1; index < nodes.length; index++) {
			const node = nodes[index];
			const previousNode = nodes[index - 1];

			const previousRightAnchor = previousNode.rightAnchor;
			const leftExpression = previousRightAnchor.add(gap);
			const nodeLeftAnchor = node.leftAnchor;
			const leftConstraint = nodeLeftAnchor.equalTo(leftExpression);
			node.addConstraint(leftConstraint);

			const firstWidthAnchor = firstNode.widthAnchor;
			const nodeWidthAnchor = node.widthAnchor;
			const widthConstraint = nodeWidthAnchor.equalTo(firstWidthAnchor);
			node.addConstraint(widthConstraint);
		}

		const parentRightAnchor = parentNode.rightAnchor;
		const lastRightExpression = parentRightAnchor.subtract(padding);
		const lastRightAnchor = lastNode.rightAnchor;
		const lastRightConstraint = lastRightAnchor.equalTo(lastRightExpression);
		lastNode.addConstraint(lastRightConstraint);
	}
}
