// This function now expects an epoch timestamp in MILLISECONDS (a number).
function divarSortDateToTehranPretty(timestampMs) {
    if (!timestampMs) return '';
    const date = new Date(timestampMs);
    return date.toLocaleString('fa-IR', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'long',
        hour12: false
    }).replace('،', '\n -');
}

// This function recursively finds the 'posts_metadata' array.
function findPostsMetadata(obj) {
    if (!obj) return null;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (Array.isArray(value) && value.length > 0 && value[0].token && value[0].sort_date) {
                return value;
            }
            if (typeof value === 'object' && value !== null) {
                const result = findPostsMetadata(value);
                if (result) return result;
            }
        }
    }
    return null;
}

const results = [];
const htmlPages = $json.data;

for (const htmlObj of htmlPages) {
    const html = htmlObj.data;

    // 1. Find and parse the __PRELOADED_STATE__ for timestamps
    const scriptTagRegex = /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/;
    const matchJson = html.match(scriptTagRegex);
    let timestampMap = new Map();

    if (matchJson && matchJson[1]) {
        try {
            const preloadedState = JSON.parse(matchJson[1]);
            const postsMetadata = findPostsMetadata(preloadedState);
            if (postsMetadata) {
                for (const meta of postsMetadata) {
                    timestampMap.set(meta.token, meta.sort_date);
                }
            }
        } catch (e) {
            console.error("Failed to parse __PRELOADED_STATE__ for timestamps.", e);
        }
    }

    // 2. Use Regex to extract visible post data from the HTML
    const postRegex = /<a[^>]+href="(\/v\/[^"]+)"[\s\S]*?<h2 class="kt-post-card__title">([^<]+)<\/h2>[\s\S]*?<div class="kt-post-card__description">([^<]+)<\/div>[\s\S]*?<div class="kt-post-card__description">([^<]+)<\/div>[\s\S]*?<span class="kt-post-card__bottom-description[^"]*"[^>]*>([^<]+)<\/span>/g;
    
    let matchHtml;
    while ((matchHtml = postRegex.exec(html)) !== null) {
        const linkPath = matchHtml[1];
        const title = matchHtml[2].trim();
        const rahn = matchHtml[3].trim();
        const ejareh = matchHtml[4].trim() || 'رهن کامل';
        const note = matchHtml[5].trim();
        const token = linkPath.split('/').pop();

        // 3. Get the microsecond timestamp string from the map
        const sortDateMicrosecondsString = timestampMap.get(token) || null;
        
        // ---- THIS IS THE CORRECTED LOGIC ----
        // Convert the 16-digit microsecond string to a 13-digit millisecond number
        const epochTimestampMs = sortDateMicrosecondsString ? Math.floor(Number(sortDateMicrosecondsString) / 1000) : null;
        
        results.push({
            "تایتل": title,
            "ودیعه": rahn,
            "اجاره": ejareh,
            "منتشر شده در": note,
            "modified_date": epochTimestampMs, // Correctly assigns the millisecond number
            "تاریخ تهران": divarSortDateToTehranPretty(epochTimestampMs), // Correctly formats the date from the millisecond number
            "لینک": `https://divar.ir${linkPath}`
        });
    }
}

return results.map(r => ({
    json: r
}));
