
sr_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = JSON.parse(this.responseText)
  update_filename("#{data.playerInfo.Title}.m4a")

  if data.playerInfo.AudioSources
    dropdown = $("#streams")
    data.playerInfo.AudioSources
    .sort (a,b) -> a.Quality < b.Quality
    .forEach (stream) ->
      kbps = stream.Quality
      kbps = kbps / 1000 if kbps > 1000
      ext = extract_extension(stream.Url) || "mp3"
      option = document.createElement("option")
      option.value = stream.Url
      option.setAttribute("data-filename", "#{data.playerInfo.Title}.#{ext}")
      option.appendChild document.createTextNode("#{data.playerInfo.Title} (#{kbps} kbps)")
      dropdown.appendChild option

    update_cmd()
