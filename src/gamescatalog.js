//==============================================================================
// 게임 카탈로그.
// - assets/data/games.json 을 비동기로 로드해서 메모리에 들고 있는다.
// - 각 항목 형식: { id, partId, title, color, visible }
//   - id:      LocalStorage / 점수판 / 업적 등에서 사용하는 고유 게임 식별자 (절대 변경 금지).
//   - partId:  네비게이션 시 pushPart 에 쓰는 PartId.
//   - title:   목록에 노출될 게임명.
//   - color:   목록 카드 배경색.
//   - visible: false 면 게임 목록에서 숨김.
//==============================================================================
const System = globalThis;


//==============================================================================
// 기본 카탈로그 경로.
//==============================================================================
const DEFAULT_CATALOG_URL = "./assets/data/games.json";


//==============================================================================
// 모듈 로컬 캐시.
//==============================================================================
/** @type { Array<object> | null } */
let catalog = null;


//==============================================================================
// games.json 로드. (이미 로드됐으면 즉시 캐시 반환)
//==============================================================================
/**
 * @param { string } [url]
 * @returns { Promise<Array<object>> }
 */
export async function loadGamesCatalog(url) {
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } catalog
	 */
	if (catalog) {
		return catalog;
	}	try {
		const response = await System.fetch(url || DEFAULT_CATALOG_URL);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}		const json = await response.json();
		catalog = (json && System.Array.isArray(json.games)) ? json.games : [];
	}
	//==============================================================================
	// catch.
	//==============================================================================
	/**
	 * @param { * } error
	 */
	catch (error) {
		console.error("[gamescatalog] 로드 실패:", error);
		catalog = [];
	}
	return catalog;
}


//==============================================================================
// 카탈로그 전체 반환. (로드 전이면 빈 배열)
//==============================================================================
/**
 * @returns { Array<object> }
 */
export function getGamesCatalog() {
	return catalog || [];
}


//==============================================================================
// visible !== false 인 항목만 반환. (게임 목록 표시용)
//==============================================================================
/**
 * @returns { Array<object> }
 */
export function getVisibleGames() {
	return (catalog || []).filter((entry) => entry && entry.visible !== false);
}


//==============================================================================
// PartId 로 GameId 조회. 카탈로그에 없거나 미로드면 null.
//==============================================================================
/**
 * @param { string } partId
 * @returns { string | null }
 */
export function getGameIdForPartId(partId) {
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } !catalog || !partId
	 */
	if (!catalog || !partId) {
		return null;
	}	const found = catalog.find((entry) => entry && entry.partId === partId);
	return found ? found.id : null;
}
