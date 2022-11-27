// TV4
// Example URL:
// https://www.tv4.se/klipp/va/3349622/namen-har-sover-peter-dalle-under-tommy-korbergs-framtradande
// Data URL:
// https://playback2.a2d.tv/asset/3349622?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets
// https://playback2.a2d.tv/play/3349622?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets
//
// TV4 Play
// Example URL:
// https://www.tv4play.se/program/nyheterna/d%C3%B6dssiffran-stiger-dramatiskt-efter-jordskalv/3349759
// Data URL:
// https://playback2.a2d.tv/asset/3349759?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets
// https://playback2.a2d.tv/play/3349759?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets

function tv4play_asset_callback(data) {
  update_filename(`${data.metadata.title.trim()}.mkv`);
  const media_url = `https://playback2.a2d.tv${data.mediaUri}`;
  console.log(media_url);
  fetch(media_url).then(get_json).then(tv4play_media_callback).catch(api_error);
}

function tv4play_media_callback(data) {
  const dropdown = $("#streams");
  const option = document.createElement("option");
  option.value = data.playbackItem.manifestUrl;
  option.appendChild(document.createTextNode(data.playbackItem.type));
  dropdown.appendChild(option);
  update_cmd();
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?tv4(?:play)?\.se\.?\/.*(?:-|\/)(\d+)/,
  func: function(ret) {
    const video_id = ret[1];
    const data_url = `https://playback2.a2d.tv/asset/${video_id}?service=tv4&device=browser&browser=GoogleChrome&protocol=hls%2Cdash&drm=widevine&capabilities=live-drm-adstitch-2%2Cexpired_assets`;
    update_filename(`${video_id}.mkv`);
    update_json_url(data_url);

    console.log(data_url);
    fetch(data_url).then(get_json).then(tv4play_asset_callback).catch(api_error);
  }
});
