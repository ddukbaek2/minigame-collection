//==============================================================================
// 공지 / 업데이트 로그 카탈로그.
// - assets/data/notices.json 을 비동기 로드.
// - 항목 형식: { date: "YYYY-MM-DD", version: "x.y.z", content: string }
//   content 의 "\n" 은 줄바꿈으로 해석된다.
// - getNotices() 는 date 내림차순 (최신이 가장 위) 으로 정렬해서 반환.
//==============================================================================
const System = globalThis;
const DEFAULT_URL = "./assets/data/notices.json";
/** @type { Array<object> | null } */ let entries = null;


//==============================================================================
// JSON 비동기 로드. (이미 로드됐으면 캐시 반환)
//==============================================================================
/**
 * @param { string } [url]
 * @returns { Promise<Array<object>> }
 */
export async function loadNotices(url) {
	if (entries) {
		return entries;
	}
	
	try {
		const response = await System.fetch(url || DEFAULT_URL);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}		const json = await response.json();
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
	if (!entries) {
		return [];
	}

	return entries.slice().sort((a, b) => {
		if (a.date < b.date) {
			return 1;
		}
		if (a.date > b.date) {
			return -1;
		}		return 0;
	});
}


//==============================================================================
// 사용자가 마지막으로 확인한 공지 날짜 LocalStorage 키.
//==============================================================================
const SEEN_STORAGE_KEY = "minigame-collection.notice.lastSeenDate";


//==============================================================================
// 가장 최근 공지의 날짜 반환. 공지가 없으면 null.
//==============================================================================
/**
 * @returns { string | null }
 */
function getLatestNoticeDate() {
	const notices = getNotices();
	if (notices.length === 0) {
		return null;
	}
	return notices[0].date;
}


//==============================================================================
// 마지막으로 확인한 공지 날짜 반환. 저장된 값이 없으면 null.
//==============================================================================
/**
 * @returns { string | null }
 */
function getLastSeenNoticeDate() {
	try {
		const value = System.localStorage.getItem(SEEN_STORAGE_KEY);
		if (typeof value === "string" && value.length > 0) {
			return value;
		}
	}
	catch (error) {
		// 무시.
	}
	return null;
}


//==============================================================================
// 사용자가 아직 보지 않은 새 공지가 있는지 여부.
// - 공지 자체가 없으면 false.
// - 마지막 확인 날짜가 없으면(첫 실행) 공지가 하나라도 있으면 true.
// - 가장 최근 공지의 날짜가 마지막 확인 날짜보다 크면 true.
//==============================================================================
/**
 * @returns { boolean }
 */
export function hasNewNotice() {
	const latestDate = getLatestNoticeDate();
	if (latestDate === null) {
		return false;
	}
	const lastSeenDate = getLastSeenNoticeDate();
	if (lastSeenDate === null) {
		return true;
	}
	return latestDate > lastSeenDate;
}


//==============================================================================
// 모든 공지를 본 것으로 표시. 가장 최근 공지의 날짜를 LocalStorage 에 저장한다.
//==============================================================================
export function markNoticesAsSeen() {
	const latestDate = getLatestNoticeDate();
	if (latestDate === null) {
		return;
	}
	try {
		System.localStorage.setItem(SEEN_STORAGE_KEY, latestDate);
	}
	catch (error) {
		// 무시.
	}
}