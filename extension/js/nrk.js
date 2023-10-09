// Example URL:
// https://tv.nrk.no/serie/ardna-tv/2016/SAPP67004716
// https://tv.nrk.no/serie/lindmo/2017/MUHU12005817
// https://radio.nrk.no/serie/tett-paa-norske-artister/MYNF51000518/04-01-2018
// https://tv.nrk.no/serie/ski-nm
// https://radio.nrk.no/podkast/bjoernen_lyver/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
// Data URL:
// https://psapi.nrk.no/playback/manifest/program/SAPP67004716
// https://psapi.nrk.no/playback/manifest/program/MUHU12005817
// https://undertekst.nrk.no/prod/SAPP67/00/SAPP67004716AA/NOR/SAPP67004716AA.vtt
// https://psapi.nrk.no/programs/manifest/program/MYNF51000518
// https://psapi.nrk.no/playback/metadata/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
// https://psapi.nrk.no/podcasts/bjoernen_lyver/episodes/nrkno-poddkast-26582-131253-19022018140000

async function nrk_callback(data) {
  console.log(data);

  const streams = $('#streams');
  const duration = parse_pt(data.playable.duration);
  for (const asset of data.playable.assets) {
    const option = document.createElement('option');
    option.value = asset.url;
    option.appendChild(document.createTextNode(extract_filename(asset.url)));
    streams.appendChild(option);

    const base_url = asset.url.replace(/\/[^/]+$/, '/');
    fetch(asset.url)
      .then(get_text)
      .then(master_callback(duration, base_url))
      .catch(api_error);
  }

  for (const subtitle of data.playable.subtitles) {
    const url = subtitle.webVtt;
    subtitles.push(url);
    const option = document.createElement('option');
    option.value = url;
    option.appendChild(
      document.createTextNode(`Undertext (${subtitle.label})`),
    );
    streams.appendChild(option);
  }

  let ext = options.default_video_file_extension;
  if (data.sourceMedium === 'audio') {
    ext = options.default_audio_file_extension;
  }
  const title = await getDocumentTitle();
  if (title) {
    const fn = `${title}.${ext}`;
    update_filename(fn);
  }
  update_cmd();
}

function nrk_postcast_callback(data) {
  console.log(data);
  const streams = $('#streams');
  for (const [i, stream] of data.downloadables.entries()) {
    const fn = extract_filename(stream.audio.url);
    if (i === 0) {
      update_filename(fn);
    }
    const option = document.createElement('option');
    option.value = stream.audio.url;
    option.setAttribute('data-filename', fn);
    option.appendChild(document.createTextNode(data.titles.title));
    streams.appendChild(option);
  }
  update_cmd();
}

matchers.push({
  re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\/(?:program|serie)[^A-Z]*\/([A-Z][A-Z0-9]+)/,
  permissions: {
    origins: ['https://psapi.nrk.no/'],
  },
  func: (ret) => {
    const video_id = ret[1];
    const data_url = `https://psapi.nrk.no/playback/manifest/program/${video_id}`;
    update_filename(`${video_id}.${options.default_video_file_extension}`);
    update_json_url(data_url);

    console.log(data_url);
    fetch(data_url).then(get_json).then(nrk_callback).catch(api_error);
  },
});

matchers.push({
  re: /^https?:\/\/radio\.nrk\.no\.?\/pod[ck]ast\/([^/]+)\/([^/?]+)/,
  permissions: {
    origins: ['https://psapi.nrk.no/'],
  },
  func: (ret) => {
    const data_url = `https://psapi.nrk.no/podcasts/${ret[1]}/episodes/${ret[2]}`;
    update_filename(`${ret[1]}-${ret[2]}.mp3`);
    update_json_url(data_url);

    console.log(data_url);
    fetch(data_url).then(get_json).then(nrk_postcast_callback).catch(api_error);
  },
});

matchers.push({
  re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\//,
  permissions: {
    origins: ['https://psapi.nrk.no/'],
  },
  func: (ret) => {
    // <div id="series-program-id-container" data-program-id="MSPO30080518">
    chrome.tabs.executeScript(
      {
        code: `(function(){
          const div = document.querySelector("[data-program-id]");
          if (!div) {
            return null;
          }
          return div.getAttribute("data-program-id");
        })()`,
      },
      (ids) => {
        console.log(ids);
        flatten(ids).forEach((video_id) => {
          const data_url = `https://psapi.nrk.no/playback/manifest/program/${video_id}`;
          update_filename(
            `${video_id}.${options.default_video_file_extension}`,
          );
          update_json_url(data_url);

          console.log(data_url);
          fetch(data_url).then(get_json).then(nrk_callback).catch(api_error);
        });
      },
    );
  },
});
