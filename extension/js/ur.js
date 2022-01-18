// https://urplay.se/program/193738-amanda-langtar-sommaren
// <script id="__NEXT_DATA__" type="application/json">{"props":...........}</script>
// https://streaming10.ur.se/urplay/_definst_/mp4:193000-193999/193738-22.mp4/playlist.m3u8

// https://urplay.se/program/175841-ur-samtiden-boy-s-own-den-brittiska-kulturrevolutionen

function ur_callback(data) {
  const program = data.program;

  return function(lb_data) {
    const domain = lb_data.redirect;
    const streams = [];
    if (program.streamingInfo.sweComplete && program.streamingInfo.sweComplete.hd) {
      streams.push({
        info: "HD med undertexter",
        url: `https://${domain}/${program.streamingInfo.sweComplete.hd.location}playlist.m3u8`
      });
    }
    if (program.streamingInfo.raw && program.streamingInfo.raw.hd) {
      streams.push({
        info: "HD",
        url: `https://${domain}/${program.streamingInfo.raw.hd.location}playlist.m3u8`
      });
    }
    if (program.streamingInfo.sweComplete && program.streamingInfo.sweComplete.sd) {
      streams.push({
        info: "SD med undertexter",
        url: `https://${domain}/${program.streamingInfo.sweComplete.sd.location}playlist.m3u8`
      });
    }
    if (program.streamingInfo.raw && program.streamingInfo.raw.sd) {
      streams.push({
        info: "SD",
        url: `https://${domain}/${program.streamingInfo.raw.sd.location}playlist.m3u8`
      });
    }
    console.log(streams);

    const dropdown = $("#streams");
    streams.forEach(function(stream) {
      const option = document.createElement("option");
      option.value = stream.url;
      option.appendChild(document.createTextNode(stream.info));
      dropdown.appendChild(option);
    });

    let fn = `${program.title?.trim()}.mkv`;
    if (program.seriesTitle) {
      fn = `${program.seriesTitle.trim()} - ${fn}`;
    }
    update_filename(fn);
    update_cmd();
  }
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?urplay\.se\.?\//,
  func: function(ret) {
    chrome.tabs.executeScript({
      code: `(function(){
        return document.querySelector("#__NEXT_DATA__").textContent;
      })()`
    }, function(ret) {
      console.log(ret);
      flatten(ret).forEach(function(json) {
        const data = JSON.parse(json);
        console.log(data);

        const lb_url = "https://streaming-loadbalancer.ur.se/loadbalancer.json";
        fetch(lb_url).then(get_json).then(ur_callback(data.props.pageProps)).catch(api_error);
      });
    });
  }
});
