// Example URL:
// https://tv.nrk.no/serie/ardna-tv/SAPP67004716/16-05-2016
// https://tv.nrk.no/serie/lindmo/MUHU12005817/14-10-2017
// https://tv.nrk.no/program/KOID75000216/bitcoineksperimentet
// https://radio.nrk.no/serie/tett-paa-norske-artister/MYNF51000518/04-01-2018
// https://tv.nrk.no/serie/ski-nm
// https://radio.nrk.no/podcast/bjoernen_lyver/nrkno-poddkast-26582-131253-19022018140000
// Data URL:
// https://psapi-ne.nrk.no/mediaelement/SAPP67004716
// https://undertekst.nrk.no/prod/SAPP67/00/SAPP67004716AA/NOR/SAPP67004716AA.vtt
// https://psapi-ne.nrk.no/mediaelement/MYNF51000518
// https://psapi-ne.nrk.no/podcasts/bjoernen_lyver/episodes/nrkno-poddkast-26582-131253-19022018140000



function nrk_callback(data) {
  console.log(data)
  var ext = "mp4"
  if (data.playable.sourceMedium == "audio") {
    ext = "m4a"
  }
  var fn = `${data.title}.${ext}`
  if (data.preplay && data.preplay.titles) {
    fn = `${data.preplay.titles.title} - ${data.preplay.titles.subtitle}.${ext}`
  }

  var dropdown = $("#streams")
  var streams = []
  data.playable.parts.forEach(function(part) {
    streams = streams.concat(part.assets).concat(part.subtitles)
  })
  console.log(streams)
  streams.forEach(function(stream) {
    var option = document.createElement("option")
    option.value = stream.url || stream.webVtt
    option.setAttribute("data-filename", fn)
    option.appendChild(document.createTextNode(extract_filename(option.value)))
    if (stream.webVtt) {
      option.appendChild(document.createTextNode(` (undertexter ${stream.label})`))
    }
    dropdown.appendChild(option)

    if (stream.format == "HLS") {
      var base_url = stream.url.replace(/\/[^/]+$/, "/")
      fetch(stream.url).then(get_text).then(master_callback(parse_pt(data.duration), fn, base_url)).catch(api_error)
    }
  })

  update_cmd()
  update_filename(fn)
}

function nrk_postcast_callback(data) {
  console.log(data)
  var dropdown = $("#streams")
  data.downloadables.forEach(function(stream) {
    var ext = extract_extension(stream.audio.url) || "mp3"
    var option = document.createElement("option")
    option.value = stream.audio.url
    option.setAttribute("data-filename", `${data.titles.title}.${ext}`)
    option.appendChild(document.createTextNode(data.titles.title))
    dropdown.appendChild(option)
  })
  update_cmd()
}

matchers.push({
  re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\/(?:program|serie)[^A-Z]*\/([A-Z][A-Z0-9]+)/,
  permissions: {
    origins: ["https://psapi-ne.nrk.no/"],
  },
  func: function(ret) {
    var video_id = ret[1]
    var data_url = `https://psapi-ne.nrk.no/mediaelement/${video_id}`
    update_filename(`${video_id}.mp4`)
    $("#open_json").href = data_url

    console.log(data_url)
    fetch(data_url, {
      headers: {
        "Accept": "application/vnd.nrk.psapi+json; version=9; ludo-client=true; psapi=snapshot",
      }
    }).then(get_json).then(nrk_callback).catch(api_error)
  }
})

matchers.push({
  re: /^https?:\/\/radio\.nrk\.no\.?\/pod[ck]ast\/([^/]+)\/([^/?]+)/,
  permissions: {
    origins: ["https://psapi-ne.nrk.no/"],
  },
  func: function(ret) {
    var data_url = `https://psapi-ne.nrk.no/podcasts/${ret[1]}/episodes/${ret[2]}`
    update_filename(`${ret[1]}-${ret[2]}.mp3`)
    $("#open_json").href = data_url

    console.log(data_url)
    fetch(data_url, {
      headers: {
        "Accept": "application/vnd.nrk.psapi+json; version=9; ludo-client=true; psapi=snapshot",
      }
    }).then(get_json).then(nrk_postcast_callback).catch(api_error)
  }
})

matchers.push({
  re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\//,
  permissions: {
    origins: ["https://psapi-ne.nrk.no/"],
  },
  func: function(ret) {
    // <div id="series-program-id-container" data-program-id="MSPO30080518">
    chrome.tabs.executeScript({
      code: `(function(){
        var div = document.querySelector("[data-program-id]");
        if (!div) {
          return null;
        }
        return div.getAttribute("data-program-id");
      })()`
    }, function(ids) {
      console.log(ids)
      flatten(ids).forEach(function(video_id) {
        var data_url = `https://psapi-ne.nrk.no/mediaelement/${video_id}`
        update_filename(`${video_id}.mp4`)
        $("#open_json").href = data_url

        console.log(data_url)
        fetch(data_url, {
          headers: {
            "Accept": "application/vnd.nrk.psapi+json; version=9; ludo-client=true; psapi=snapshot",
          }
        }).then(get_json).then(nrk_callback).catch(api_error)
      })
    })
  }
})
