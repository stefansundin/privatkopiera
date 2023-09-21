// TV4
// Example URL:
// https://www.tv4.se/klipp/va/3349622/namen-har-sover-peter-dalle-under-tommy-korbergs-framtradande
// Data URL:
// https://playback2.a2d.tv/asset/3349622?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets
// https://playback2.a2d.tv/play/3349622?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets
//
// TV4 Play
// Example URL: (login not required)
// https://www.tv4play.se/klipp/040fd805b89cd0bae2c3
// Data URL:
// https://playback2.a2d.tv/play/040fd805b89cd0bae2c3?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=MozillaFirefox&capabilities=live-drm-adstitch-2%2Cyospace3
// https://vod.streaming.a2d.tv/93160d0a-55ab-4832-980e-ae790483b6ed/8e5f2ae0-47f3-11ed-986d-fd7a5f3ea464_20251151.ism/.m3u8
//
// Example URL: (login required)
// https://www.tv4play.se/video/35e58882dbdd430da786/cornelia-jakobs
// Data URL: (valid X-Jwt token required)
// https://playback2.a2d.tv/play/35e58882dbdd430da786?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=MicrosoftEdge&capabilities=live-drm-adstitch-2%2Cyospace3

function tv4play_asset_callback(data) {
  const media_url = `https://playback2.a2d.tv${data.mediaUri}`;
  console.log(media_url);
  fetch(media_url).then(get_json).then(tv4play_media_callback).catch(api_error);
}

function tv4play_media_callback(data) {
  update_filename(`${data.metadata.title.trim()}.${options.default_video_file_extension}`);
  update_json_url(data.playbackItem.manifestUrl);

  const dropdown = $("#streams");
  const option = document.createElement("option");
  option.value = data.playbackItem.manifestUrl;
  option.appendChild(document.createTextNode(data.playbackItem.type));
  dropdown.appendChild(option);
  update_cmd();
}

function tv4_error(e) {
  console.log(e);
  // delete the cached access token in case it needs refreshing.. the user can try again and maybe it will work.
  localStorage.removeItem("tv4-access-token");
  error("Något gick fel. Videon kanske kräver att du är inloggad?");
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?tv4play\.se\.?\/(?:video|program|klipp)\/([0-9a-f]+)/,
  // permissions: {
  //   origins: ["https://avod-auth-alb.a2d.tv/"],
  // },
  func: async function(ret) {
    const video_id = ret[1];
    update_filename(`${video_id}.${options.default_video_file_extension}`);

    let access_token = localStorageGetWithExpiry("tv4-access-token");
    console.log('cached access_token', access_token);
    if (access_token && !access_token.startsWith('ey')) {
      access_token = undefined;
    }

    if (!access_token) {
      const injectionResult = await chrome.scripting.executeScript({
        target: { tabId: tab_id },
        func: async () => {
          const refresh_token = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('tv4-refresh-token='))?.split('=')[1];
          if (!refresh_token) {
            return 'no refresh token';
          }
          const response = await fetch('https://avod-auth-alb.a2d.tv/oauth/refresh', {
            method: 'POST',
            credentials: 'omit',
            mode: 'cors',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
            },
            body: JSON.stringify({ refresh_token, client_id: 'tv4-web' }),
          });
          if (!response.ok) {
            return `error: ${response.status}`;
          }
          const access_token_data = await response.json();
          return access_token_data.access_token;
        },
      });
      console.log('injectionResult', injectionResult);
      if (injectionResult[0].result.startsWith('ey')) {
        access_token = injectionResult[0].result;
      } else {
        error('Nu gick något nog fel.. men vi försöker ändå.');
      }
    }

    const metadata_url = `https://playback2.a2d.tv/play/${video_id}?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=GoogleChrome&capabilities=live-drm-adstitch-2%2Cyospace3`;
    fetch(metadata_url, {
      headers: access_token ? {
        'X-Jwt': `Bearer ${access_token}`,
      } : {}
    }).then(get_json).then(tv4play_media_callback).catch(tv4_error);
  }
});

matchers.push({
  re: /^https?:\/\/(?:www\.)?tv4?\.se\.?\/.*(?:-|\/)(\d+)/,
  func: function(ret) {
    // This does not work on new URLs
    const video_id = ret[1];
    const data_url = `https://playback2.a2d.tv/asset/${video_id}?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets`;
    update_filename(`${video_id}.${options.default_video_file_extension}`);
    update_json_url(data_url);

    console.log(data_url);
    fetch(data_url).then(get_json).then(tv4play_asset_callback).catch(api_error);
  }
});
