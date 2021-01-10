// TV4
// Example URL:
// https://www.tv4.se/nyhetsmorgon/klipp/n%C3%A4men-h%C3%A4r-sover-peter-dalle-under-tommy-k%C3%B6rbergs-framtr%C3%A4dande-3349622
// Data URL:
// https://playback-api.b17g.net/asset/3349622?service=tv4&device=browser&drm=&protocol=hls%2Cdash
// https://playback-api.b17g.net/media/3349622?service=tv4&device=browser&protocol=hls%2Cdash&is_clip=true
//
// TV4 Play
// Example URL:
// https://www.tv4play.se/program/nyheterna/3349759
// Data URL:
// https://playback-api.b17g.net/asset/3349759?service=tv4&device=browser&drm=widevine&protocol=hls%2Cdash
// https://playback-api.b17g.net/media/3349759?service=tv4&device=browser&protocol=hls%2Cdash&drm=widevine&is_clip=true
//
// could probably avoid the request to /asset/ and just grab the tab title for the filename.
// is_clip seem to be optional:
// https://playback-api.b17g.net/asset/3349759?service=tv4&device=browser&protocol=hls%2Cdash
// https://playback-api.b17g.net/media/3349759?service=tv4&device=browser&protocol=hls%2Cdash
//
// drm is required:
// https://www.tv4play.se/program/maria-lang/10001026
// https://playback-api.b17g.net/asset/10001026?service=tv4&device=browser&drm=widevine&protocol=hls%2Cdash
//
// Multiple items:
// https://www.tv4play.se/program/jul-med-ernst/3946707
// https://playback-api.b17g.net/asset/3946707?service=tv4&device=browser&protocol=hls%2Cdash
// https://playback-api.b17g.net/media/3946707?service=tv4&device=browser&protocol=hls%2Cdash

function tv4play_asset_callback(data) {
  update_filename(`${data.metadata.title}.mkv`);
  const media_url = `https://playback-api.b17g.net${data.mediaUri}`;
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
    const data_url = `https://playback-api.b17g.net/asset/${video_id}?service=tv4&device=browser&drm=widevine&protocol=hls%2Cdash`;
    update_filename(`${video_id}.mkv`);
    update_json_url(data_url);

    console.log(data_url);
    fetch(data_url).then(get_json).then(tv4play_asset_callback).catch(api_error);
  }
});
