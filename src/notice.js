//==============================================================================
// 공지 / 업데이트 로그 카탈로그.
// - assets/data/notices.json 을 비동기 로드.
// - 항목 형식: { date: "YYYY-MM-DD", version: "x.y.z", content: string }
//   content 의 "\n" 은 줄바꿈으로 해석된다.
// - getNotices() 는 date 내림차순 (최신이 가장 위) 으로 정렬해서 반환.
//==============================================================================
const System = globalThis;


const DEFAULT_URL = "./assets/data/notices.json";

/** @type { Array<object> | null } */
let entries = null;


//==============================================================================
// JSON 비동기 로드. (이미 로드됐으면 캐시 반환)
//==============================================================================
/**
 * @param { string } [url]
 * @returns { Promise<Array<object>> }
 */
export async function loadNotices(url) {
	if (entries) return entries;
	try {
		const response = await System.fetch(url || DEFAULT_URL);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const json = await response.json();
		const raw = (json && System.Array.isArray(json.notices)) ? json.notices : [];
		entries = raw.filter((entry) => entry && typeof entry.date === "string" && typeof entry.content === "string");
	}
	catch (error) {
		console.error("[notice] 로드 실패:", error);
		entries = [];
	}
	return entries;
}


//==============================================================================
// date 내림차순 정렬된 사본 반환.
//==============================================================================
/**
 * @returns { Array<object> }
 */
export function getNotices() {
	if (!entries) return [];
	return entries.slice().sort((a, b) => {
		if (a.date < b.date) return 1;
		if (a.date > b.date) return -1;
		return 0;
	});
}
