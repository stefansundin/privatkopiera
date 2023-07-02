// TV4
// Example URL:
// https://www.tv4play.se/video/35e58882dbdd430da786/cornelia-jakobs
// Data URL:
// https://playback2.a2d.tv/play/35e58882dbdd430da786?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=MicrosoftEdge&capabilities=live-drm-adstitch-2%2Cyospace3
// Requires valid X-Jwt token

const localStorageAccessTokenKey = "tv4-access-token";
function save_access_token(data) {
  var accessToken = data.access_token;
  console.log("Ny access token satt");
  // 4 hours
  var expireTimeInSeconds = 3600 * 4 * 1000;
  setWithExpiry(localStorageAccessTokenKey, accessToken, expireTimeInSeconds);
}

function tv4play_media_callback(data)
{
  update_filename(`${data.metadata.title.trim()}.mkv`);
  update_json_url(data.playbackItem.manifestUrl);

  const dropdown = $("#streams");
  const option = document.createElement("option");
  option.value = data.playbackItem.manifestUrl;
  option.appendChild(document.createTextNode(data.playbackItem.type));
  dropdown.appendChild(option);
  update_cmd();
}


matchers.push({
  re: /^https?:\/\/(?:www\.)?tv4(?:play)?\.se\.?\/video\/([a-f0-9]+)/,
  func: function(ret) {
    const video_id = ret[1];
    console.log(video_id);
    update_filename(`${video_id}.mkv`);
    fetchMetaFile = function()
    {
        var tv4AccessToken = getWithExpiry(localStorageAccessTokenKey);
        if (tv4AccessToken == null) {
            error("Misslyckades hämta en giltig tv4 access token");
            return;
        }
        const metadataURL = `https://playback2.a2d.tv/play/${video_id}?service=tv4play&device=browser&protocol=hls%2Cdash&drm=widevine&browser=MicrosoftEdge&capabilities=live-drm-adstitch-2%2Cyospace3`;
        fetch(metadataURL, {
            method: 'GET',
            headers: {
                'X-Jwt': `Bearer ${tv4AccessToken}`
            }
        }).then(get_json).then(tv4play_media_callback).catch(api_error);
    }

    var tv4AccessTokenValue = getWithExpiry(localStorageAccessTokenKey);
    if (tv4AccessTokenValue == null) {
      var filter = { domain: "www.tv4play.se", name: "tv4-refresh-token" };
      chrome.cookies.getAll(filter, function (cookies) {
        var tv4RefreshToken = cookies[0].value;
        if (tv4RefreshToken == null) {
           error("Ingen tv4-refresh-token är satt. Du är inte inloggad?");
           return;
        }

        const refresh_url = "https://avod-auth-alb.a2d.tv/oauth/refresh";
        fetch(refresh_url, {
            method: 'POST',
            body: JSON.stringify({ refresh_token: tv4RefreshToken }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(get_json).then(save_access_token).then(fetchMetaFile).catch(api_error);
      });
    } else {
        fetchMetaFile();
    }
  }
});

// LocalStorage with expiry time: https://www.sohamkamani.com/javascript/localstorage-with-ttl-expiry/
function setWithExpiry(key, value, ttl) {
    const now = new Date()

    // `item` is an object which contains the original value
    // as well as the time when it's supposed to expire
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    }
    localStorage.setItem(key, JSON.stringify(item))
}
function getWithExpiry(key) {
    const itemStr = localStorage.getItem(key)
    // if the item doesn't exist, return null
    if (!itemStr) {
        return null
    }
    const item = JSON.parse(itemStr)
    const now = new Date()
    // compare the expiry time of the item with the current time
    if (now.getTime() > item.expiry) {
        // If the item is expired, delete the item from storage
        // and return null
        localStorage.removeItem(key)
        return null
    }
    return item.value
}
