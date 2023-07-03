// Example URL:
// https://tv.nrk.no/serie/ardna-tv/SAPP67004716/16-05-2016
// https://tv.nrk.no/serie/lindmo/MUHU12005817/14-10-2017
// https://radio.nrk.no/serie/tett-paa-norske-artister/MYNF51000518/04-01-2018
// https://tv.nrk.no/serie/ski-nm
// https://radio.nrk.no/podkast/bjoernen_lyver/nrkno-poddkast-26582-131253-19022018140000
// Data URL:
// https://psapi.nrk.no/programs/SAPP67004716
// https://undertekst.nrk.no/prod/SAPP67/00/SAPP67004716AA/NOR/SAPP67004716AA.vtt
// https://psapi.nrk.no/programs/MYNF51000518
// https://psapi.nrk.no/podcasts/bjoernen_lyver/episodes/nrkno-poddkast-26582-131253-19022018140000

function nrk_callback(data) {
  console.log(data);

  const streams = $("#streams");
  data.mediaAssetsOnDemand.forEach(function(part) {
    const option = document.createElement("option");
    option.value = part.hlsUrl;
    option.appendChild(document.createTextNode(extract_filename(part.hlsUrl)));
    streams.appendChild(option);

    const base_url = part.hlsUrl.replace(/\/[^/]+$/, "/");
    const duration = parse_pt(part.duration);
    fetch(part.hlsUrl).then(get_text).then(master_callback(duration, base_url)).catch(api_error);

    if (part.webVttSubtitles) {
      const url = decodeURIComponent(part.webVttSubtitles);
      subtitles.push(url);
      const option = document.createElement("option");
      option.value = url;
      option.appendChild(document.createTextNode(`Undertext (${extract_filename(url)})`));
      streams.appendChild(option);
    }
  });

  let ext = options.default_video_file_extension;
  if (data.sourceMedium == 2) {
    ext = options.default_audio_file_extension;
  }
  let fn = `${data.title}.${ext}`;
  if (data.preplay && data.preplay.titles) {
    fn = `${data.preplay.titles.title} - ${data.preplay.titles.subtitle}.${ext}`;
  }
  update_filename(fn);
  update_cmd();
}

function nrk_postcast_callback(data) {
  console.log(data);
  const streams = $("#streams");
  data.downloadables.forEach(function(stream) {
    const ext = extract_extension(stream.audio.url) || "mp3";
    const option = document.createElement("option");
    option.value = stream.audio.url;
    option.setAttribute("data-filename", `${data.titles.title}.${ext}`);
    option.appendChild(document.createTextNode(data.titles.title));
    streams.appendChild(option);
  });
  update_cmd();
}

matchers.push({
  re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\/(?:program|serie)[^A-Z]*\/([A-Z][A-Z0-9]+)/,
  permissions: {
    origins: ["https://psapi.nrk.no/"],
  },
  func: function(ret) {
    const video_id = ret[1];
    const data_url = `https://psapi.nrk.no/programs/${video_id}`;
    update_filename(`${video_id}.${options.default_video_file_extension}`);
    update_json_url(data_url);

    console.log(data_url);
    fetch(data_url).then(get_json).then(nrk_callback).catch(api_error);
  }
});

matchers.push({
  re: /^https?:\/\/radio\.nrk\.no\.?\/pod[ck]ast\/([^/]+)\/([^/?]+)/,
  permissions: {
    origins: ["https://psapi.nrk.no/"],
  },
  func: function(ret) {
    const data_url = `https://psapi.nrk.no/podcasts/${ret[1]}/episodes/${ret[2]}`;
    update_filename(`${ret[1]}-${ret[2]}.mp3`);
    update_json_url(data_url);

    console.log(data_url);
    fetch(data_url).then(get_json).then(nrk_postcast_callback).catch(api_error);
  }
});

matchers.push({
  re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\//,
  permissions: {
    origins: ["https://psapi.nrk.no/"],
  },
  func: function(ret) {
    // <div id="series-program-id-container" data-program-id="MSPO30080518">
    chrome.tabs.executeScript({
      code: `(function(){
        const div = document.querySelector("[data-program-id]");
        if (!div) {
          return null;
        }
        return div.getAttribute("data-program-id");
      })()`
    }, function(ids) {
      console.log(ids);
      flatten(ids).forEach(function(video_id) {
        const data_url = `https://psapi.nrk.no/programs/${video_id}`;
        update_filename(`${video_id}.${options.default_video_file_extension}`);
        update_json_url(data_url);

        console.log(data_url);
        fetch(data_url).then(get_json).then(nrk_callback).catch(api_error);
      });
    });
  }
});
