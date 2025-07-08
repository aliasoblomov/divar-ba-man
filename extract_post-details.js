
function divarSortDateToTehranPretty(sort_date) {
  if (!sort_date || sort_date === 'Not Found') return '';
  const ms = Math.floor(Number(sort_date) / 1000);
  const date = new Date(ms);
  const fa = date.toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
  const [datePart, timePart] = fa.split('،');
  if (!datePart || !timePart) return fa;
  const [year, month, day] = datePart.split('/');
  const monthName = months[parseInt(month, 10)];
  const time = timePart.replace(/[^\d:]/g, '').split(':');
  const hourMinute = time[0] + ':' + time[1];
  // Convert Persian digits to English
  const toEn = s => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  return `${toEn(String(Number(day)))} ${monthName} ، ${toEn(hourMinute)}`;
}

const results = [];
const htmlPages = $json.data; // This is an array of {data: "<html>...</html>"}

for (const htmlObj of htmlPages) {
  const html = htmlObj.data; // The HTML string

  // Extract __PRELOADED_STATE__ JSON
  const scriptTagRegex = /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/;
  const match = html.match(scriptTagRegex);

  if (!match || !match[1]) continue;

  let preloadedState;
  try {
    preloadedState = JSON.parse(match[1]);
  } catch (e) {
    continue;
  }

  // Find posts_metadata
  let postsMetadata = null;
  if (preloadedState?.nb?.actionLog?.server_side_info?.info?.posts_metadata) {
    postsMetadata = preloadedState.nb.actionLog.server_side_info.info.posts_metadata;
  } else if (preloadedState?.posts_metadata) {
    postsMetadata = preloadedState.posts_metadata;
  } else if (preloadedState?.actionLog?.server_side_info?.info?.posts_metadata) {
    postsMetadata = preloadedState.actionLog.server_side_info.info.posts_metadata;
  } else {
    function findPostsMeta(obj) {
      if (Array.isArray(obj) && obj.length && obj[0].token && obj[0].sort_date) return obj;
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          const found = findPostsMeta(obj[key]);
          if (found) return found;
        }
      }
      return null;
    }
    postsMetadata = findPostsMeta(preloadedState);
  }
  if (!Array.isArray(postsMetadata)) continue;

  // Extract posts from HTML
  const postRegex = /href="(\/v\/[^"]+)"[\s\S]*?<h2 class="unsafe-kt-post-card__title">([^<]+)<\/h2>[\s\S]*?<div class="unsafe-kt-post-card__description">([^<]*)<\/div>[\s\S]*?<div class="unsafe-kt-post-card__description">([^<]*)<\/div>[\s\S]*?<span class="unsafe-kt-post-card__bottom-description[^"]*" title="([^"]*)"/g;

  let matchPost;
  while ((matchPost = postRegex.exec(html)) !== null) {
    const link = matchPost[1];
    const title = matchPost[2].trim();
    const price1 = matchPost[3].trim();
    const price2 = matchPost[4].trim();
    const published_at = matchPost[5].trim();

    // Extract token from link
    const urlParts = link.split('/');
    let token = urlParts[urlParts.length - 1];
    if (!token) token = urlParts[urlParts.length - 2];

    // Find sort_date for this token
    let modified_date = 'Not Found';
    const meta = postsMetadata.find(m => 
      decodeURIComponent(m.token).toLowerCase() === decodeURIComponent(token).toLowerCase()
    );
    if (meta && meta.sort_date) {
      modified_date = meta.sort_date;
    }

    results.push({
      "تایتل": title,
      "ودیعه": price1,
      "اجاره": price2 || 'رهن کامل',
      "منتشر شده در": published_at,
      "modified_date": modified_date,
      "تاریخ تهران": divarSortDateToTehranPretty(modified_date),
      "لینک": `https://divar.ir${link}`
    });
  }
}

return results.map(r => ({json: r}));
