// TV4
// Example URL:
// https://www.tv4.se/artikel/5eD4WDQAzyISFui6g5RMmW/alva-och-shakila-oevertygade-politikerna-far-20-000-till-koerkort
// Data URL:
// https://playback2.a2d.tv/play/20758022?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=GoogleChrome&capabilities=live-drm-adstitch-2%2Cyospace3
//
// TV4 Play
// Example URL: (login not required)
// https://www.tv4play.se/klipp/040fd805b89cd0bae2c3
// Data URL:
// https://playback2.a2d.tv/play/040fd805b89cd0bae2c3?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=MozillaFirefox&capabilities=live-drm-adstitch-2%2Cyospace3
// https://vod.streaming.a2d.tv/93160d0a-55ab-4832-980e-ae790483b6ed/8e5f2ae0-47f3-11ed-986d-fd7a5f3ea464_20251151.ism/.m3u8
//
// Example URL: (login required)
// https://www.tv4play.se/video/8ff56dd8e591e1854af1/crossfire
// Data URL: (valid X-Jwt token required)
// https://playback2.a2d.tv/play/8ff56dd8e591e1854af1?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=GoogleChrome&capabilities=live-drm-adstitch-2%2Cyospace3

import {
  apiError,
  info,
  options,
  processPlaylist,
  updateCommand,
  updateFilename,
} from '../popup.js';
import {
  $,
  fetchJson,
  fetchPageData,
  localStorageGetWithExpiry,
  localStorageSetWithExpiry,
  tab,
} from '../utils.js';

function callback(data, expand = false) {
  // console.debug('data', data);
  const dropdown = $('#streams');
  let filename = data.metadata.title.trim();
  if (options.add_source_id_to_filename && data.id) {
    filename += ` [TV4 ${data.id}]`;
  }
  filename += `.${options.default_video_file_extension}`;
  if (dropdown.childNodes.length === 0) {
    updateFilename(filename);
  }

  const option = document.createElement('option');
  option.value = data.playbackItem.manifestUrl;
  option.appendChild(document.createTextNode(data.metadata.title.trim()));
  option.setAttribute('data-filename', filename);
  dropdown.appendChild(option);
  updateCommand();

  if (expand && data.playbackItem.type === 'hls') {
    processPlaylist(data.playbackItem.manifestUrl).catch(
      apiError,
    );
  }
}

function error(err) {
  console.error(err);
  // delete the cached access token in case it needs refreshing.. the user can try again and maybe it will work.
  localStorage.removeItem('tv4-access-token');
  info('Något gick fel. Videon kanske kräver att du är inloggad?');
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?tv4play\.se\.?\/(?:video|program|klipp|korthet)\/([0-9a-f]+)/,
    func: async (ret) => {
      const videoId = ret[1];
      updateFilename(`${videoId}.${options.default_video_file_extension}`);

      let accessToken = localStorageGetWithExpiry('tv4-access-token');
      if (accessToken && !accessToken.startsWith('ey')) {
        accessToken = undefined;
      }

      if (!accessToken) {
        try {
          const injectionResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async () => {
              try {
                const refreshToken = document.cookie
                  .split(';')
                  .map((c) => c.trim())
                  .find((c) => c.startsWith('tv4-refresh-token='))
                  ?.split('=')[1];
                if (!refreshToken) {
                  return { error: 'no refresh token' };
                }
                const response = await fetch(
                  'https://avod-auth-alb.a2d.tv/oauth/refresh',
                  {
                    method: 'POST',
                    credentials: 'omit',
                    mode: 'cors',
                    headers: {
                      accept: 'application/json',
                      'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                      refreshToken,
                      client_id: 'tv4-web',
                    }),
                  },
                );
                if (!response.ok) {
                  return {
                    error: `Invalid response: ${response.status} ${await response.text()}`,
                  };
                }
                const accessTokenData = await response.json();
                return { result: accessTokenData.accessToken };
              } catch (err) {
                return { error: err.message };
              }
            },
          });
          console.debug('injectionResult', injectionResult);
          if (injectionResult[0].error) {
            throw injectionResult[0].error;
          } else if (injectionResult[0].result === null) {
            throw new Error('Script error.');
          } else if (injectionResult[0].result.error) {
            throw new Error(injectionResult[0].result.error);
          }
          accessToken = injectionResult[0].result.result;
          localStorageSetWithExpiry(
            'tv4-access-token',
            accessToken,
            4 * 3600 * 1000,
          );
        } catch (err) {
          // Not all videos require a login, so even if there's an error above we still continue, just log the error in the console
          console.error(err);
        }
      }

      const metadataUrl = `https://playback2.a2d.tv/play/${videoId}?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=GoogleChrome&capabilities=live-drm-adstitch-2%2Cyospace3`;
      fetchJson(metadataUrl, {
        headers: accessToken
          ? {
            'X-Jwt': `Bearer ${accessToken}`,
          }
          : {},
      }).then((data) => callback(data, true)).catch(error);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?tv4\.se\.?\//,
    func: async (_, url) => {
      const data = await fetchPageData(url);
      const videoIds = Object.values(data.props.apolloState)
        .filter((thing) => thing.type === 'clipvideo')
        .map((v) => v.id);

      for (const videoId of videoIds) {
        const metadataUrl = `https://playback2.a2d.tv/play/${videoId}?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=GoogleChrome&capabilities=live-drm-adstitch-2%2Cyospace3`;
        console.log(metadataUrl);
        fetchJson(metadataUrl, {
          headers: {
            accept: 'application/json',
          },
        }).then(callback).catch(error);
      }

      if (videoIds.length === 0) {
        info('Hittade ingen video.');
      }
    },
  },
];
