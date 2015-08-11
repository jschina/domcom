toComponent = require './toComponent'
TransformComponent = require './TransformComponent'
{funcString, newLine} = require '../../util'

mergeThenElseValue = (test, thenValue, elseValue) ->
  if typeof thenValue == 'function'
    if typeof elseValue == 'function'
       -> if test() then thenValue() else elseValue()
    else -> if test() then thenValue() else elseValue
  else
    if typeof elseValue == 'function'
      -> if test() then thenValue else elseValue()
    else -> if test() then thenValue else elseValue

maybeIf = (test, then_, else_, options) ->
  if then_==else_ then return then_
  if typeof test == 'function'
    if then_.isTag and else_.isTag and then_.tagName==else_.tagName and then_.namespace==else_.namespace
      attrs = Object.create(null)
      thenAttrs = then_.attrs
      elseAttrs = else_.attrs
      for key of bothKeys(thenAttrs, elseAttrs)
        attrs[key] = mergeThenElseValue(test, thenAttrs[key], elseAttrs[key])
      attrs.namespace = then_.namespace
      new Tag(then_.tagName, attrs, children)
    else if then_.type=='Text' and else_.type=='Text'
      new Text(mergeThenElseValue(test, then_.text, else_.text))
    else if then_.type=='Comment' and else_.type=='Comment'
      new Comment(mergeThenElseValue(test, then_.text, else_.text))
    else if then_.type=='Html' and else_.type=='Html'
      new Html(mergeThenElseValue(test, then_.text, else_.text))
  else if test then then_
  else else_

module.exports = class If extends TransformComponent
  constructor: (test, then_, else_, options) ->
    super(options)

    @then_ = then_ = toComponent(then_) #.inside(@, @)
    @else_ = else_ = toComponent(else_) #.inside(@, @)

    @init = -> then_.init(); else_.init()

    if typeof test == 'function'
      @getVirtualTree = =>
        content = if test() then then_ else else_
        vtree = content.getVirtualTree()
        vtree.vtreeRootComponent = @
        vtree.srcComponents.unshift([@, null])
        @vtree = vtree
      @setParentNode = (node) ->
        @parentNode = node
        then_.setParentNode node
        else_.setParentNode node
    else
      content = if test then then_ else else_
      @getVirtualTree = ->
        vtree = content.getVirtualTree()
        vtree.srcComponents.unshift([@, null])
        @vtree = vtree
      @setParentNode = (node) ->
        @parentNode = node
        content.setParentNode node
    @clone = (options) -> (new If(test, then_.clone(), else_clone(), options or @options)).copyLifeCallback(@)



    @toString = (indent=0, noNewLine='') ->
      newLine(indent, noNewLine)+'<if '+funcString(test)+'>' + then_.toString(indent+2) + else_.toString(indent+2)+newLine('</if>', indent)

    this

