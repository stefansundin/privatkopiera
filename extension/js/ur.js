// https://urplay.se/program/200193-ett-tva-tre-tyra-vem-ar-tyra
// https://urskola.se/Produkter/198142-Kemiexperiment-Absorbans-och-fluorescens

// https://urplay.se/program/193738-amanda-langtar-sommaren
// urPlayer.init({"id":193738,"streamable":true,"image":"//assets.ur.se/id/193738/images/1_hd.jpg","product_type":"programtv","title":"Amanda längtar : Sommaren","duration":270,"series_id":193740,"series_title":"Amanda längtar","file_http_sub":"urplay/_definst_/mp4:193000-193999/193738-23.mp4/","file_http_sub_hd":"urplay/_definst_/mp4:193000-193999/193738-22.mp4/","file_http":"urplay/_definst_/mp4:193000-193999/193738-12.mp4/","file_http_hd":"urplay/_definst_/mp4:193000-193999/193738-9.mp4/","file_rtmp":"193000-193999/193738-12.mp4","file_rtmp_hd":"193000-193999/193738-9.mp4","subtitles":[{"file":"//undertexter.ur.se/193000-193999/193738-17.vtt","label":"Svenska","default":true},{"file":"//assets.ur.se/id/193738/images/thumbnails.vtt","kind":"thumbnails"}],"only_in_sweden":false,"streaming_config":{"http_streaming":{"hls_file":"playlist.m3u8","hds_file":"manifest.f4m","smooth_file":"Manifest"},"tt_subtitles":{"base_uri":"http://undertexter.ur.se/"},"rtmp":{"application":"urplay"},"loadbalancer":"https://streaming-loadbalancer.ur.se/loadbalancer.json"},"autostart":false});
// https://streaming4.ur.se/urplay/_definst_/mp4:193000-193999/193738-12.mp4/playlist.m3u8?pid=cao6ju&cid=urplay

function ur_callback(data) {
  return function(lb_data) {
    var domain = lb_data.redirect
    var streams = []
    if (data.file_http_sub_hd) {
      streams.push({
        info: "HD med undertexter",
        url: `https://${domain}/${data.file_http_sub_hd}${data.streaming_config.http_streaming.hls_file}`
      })
    }
    if (data.file_http_hd) {
      streams.push({
        info: "HD",
        url: `https://${domain}/${data.file_http_hd}${data.streaming_config.http_streaming.hls_file}`
      })
    }
    if (data.file_http_sub) {
      streams.push({
        info: "SD med undertexter",
        url: `https://${domain}/${data.file_http_sub}${data.streaming_config.http_streaming.hls_file}`
      })
    }
    if (data.file_http) {
      streams.push({
        info: "SD",
        url: `https://${domain}/${data.file_http}${data.streaming_config.http_streaming.hls_file}`
      })
    }
    if (data.subtitles) {
      data.subtitles.filter(s => s.label).forEach(s => {
        streams.push({
          info: `Undertext (${s.label})`,
          url: s.file
        })
      })
    }

    var dropdown = $("#streams")
    console.log(streams)
    streams.forEach(function(stream) {
      var option = document.createElement("option")
      option.value = stream.url
      option.appendChild(document.createTextNode(stream.info))
      dropdown.appendChild(option)
    })

    update_filename(`${data.title}.mp4`)
    update_cmd()
  }
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?(?:urplay|urskola)\.se\//,
  func: function(ret) {
    // look for urPlayer.init({...})
    chrome.tabs.executeScript({
      code: `(function(){
        var scripts = document.getElementsByTagName("script");
        for (var i=0; i < scripts.length; i++) {
          var re = /urPlayer\\.init\\(({.+})\\)/.exec(scripts[i].textContent);
          if (!re) {
            continue;
          }
          return re[1];
        }
      })()`
    }, function(ret) {
      console.log(ret)
      flatten(ret).forEach(function(json) {
        var data = JSON.parse(json)
        console.log(data)
        $("#open_json").classList.add("disabled")

        var lb_url = data.streaming_config.loadbalancer
        if (lb_url.substr(0,2) == "//") {
          lb_url = `https:${lb_url}`
        }

        fetch(lb_url).then(get_json).then(ur_callback(data)).catch(api_error)
      })
    })
  }
})
