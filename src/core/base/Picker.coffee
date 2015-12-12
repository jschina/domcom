toComponent = require './toComponent'

TransformComponent = require './TransformComponent'

{newLine} = require 'dc-util'

extend = require 'extend'

module.exports = class Picker extends TransformComponent
  constructor: (content, field) ->

    super()

    @_content = content = toComponent content

    @family = family = extend {}, content.family
    family[@dcid] = true

    if !field?
      @field = field = 'content'
    else @field = field

    if Object.defineProperty

      get = -> @_content
      set = (content) ->
        setContent(@, content)

      Object.defineProperty(this, field, {get, set})

  setContent: (content) ->
    setContent(@, content)

  onSetContent: (content, oldContent) ->

  getContentComponent: -> @_content

  # this probably should be overloaded by the subclass
  clone: -> (new @constructor(@content)).copyEventListeners(@)

  toString: (indent=0, addNewLine='') ->
      newLine('', indent, addNewLine)+'<Picker:'+@field+': '+@content.toString(indent+2, true)+'>'

setContent = (component, content) ->
  oldContent = component._content

  if content == oldContent
    content
  else
    component.onSetContent(content, oldContent)
    content = toComponent content
    component.invalidateTransform()
    component._content = content

