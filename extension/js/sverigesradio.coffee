
sr_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = JSON.parse(this.responseText)
  update_filename("#{data.playerInfo.Title}.m4a")

  dropdown = $("#streams")
  data.playerInfo.AudioSources
  .sort (a,b) -> a.Quality < b.Quality
  .forEach (stream) ->
    option = document.createElement("option")
    option.value = stream.Url
    option.setAttribute("data-filename", "#{data.playerInfo.Title}.m4a")
    option.appendChild document.createTextNode("#{data.playerInfo.Title} (#{stream.Quality/1000} kbps)")
    dropdown.appendChild option

  update_cmd()
