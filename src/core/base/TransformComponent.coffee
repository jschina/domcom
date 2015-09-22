Component = require './component'
{insertNode} = require '../../dom-util'

module.exports = class TransformComponent extends Component
  constructor: (options) ->
    super(options)
    @valid = false
    @isTransformComponent = true

  setRefContainer: (container) ->
    @container = container
    @holder = container
    @

  invalidate: ->
    if !@valid then return
    @valid = false
    activeChild = @
    holder = @holder
    while holder and !holder.isContainer
      if holder.isTransformComponent
        holder.valid = false
        activeChild = holder
      holder = holder.holder
    if holder and holder.isContainer
      holder.activeOffspring = holder.activeOffspring or Object.create(null)
      holder.activeOffspring[activeChild.dcid] = activeChild
      holder.invalidate()

  render: (mounting) ->
    oldBaseComponent = @baseComponent
    mountMode = @mountMode
    if mountMode=='unmounting'
      oldBaseComponent.remove()
      if @listIndex? then @holder.removeChild(@listIndex) #notSetFirstLast
      @mountMode = null
      @node
    baseComponent = @getBaseComponent()
    baseComponent.parentNode = @parentNode
    created = baseComponent.created
    if oldBaseComponent and baseComponent!=oldBaseComponent
      oldBaseComponent.replace(baseComponent, @) # pass the root holder
      if @listIndex?
        @container.node[@listIndex] = baseComponent.node
      @node
    else
      if !created
        nextNode = oldBaseComponent and oldBaseComponent.nextNodeComponent and oldBaseComponent.nextNodeComponent.node or @mountBeforeNode
        baseComponent.executeMountCallback()
        baseComponent.createDom(mounting)
        baseComponent.attachNode(nextNode)
        baseComponent.created = true
        @firstNodeComponent = baseComponent.firstNodeComponent
        @lastNodeComponent = baseComponent.lastNodeComponent
        @node = baseComponent.node
      else
        mounting = @mountMode=='mounting' or mounting
        if mounting
          nextNode = oldBaseComponent and oldBaseComponent.nextNodeComponent and oldBaseComponent.nextNodeComponent.node or @mountBeforeNode
          baseComponent.executeMountCallback()
          if !baseComponent.noop then baseComponent.updateDom(mounting)
          baseComponent.attachNode(nextNode)
          @mountMode = null
          @node
        else if !baseComponent.noop then baseComponent.updateDom(mounting)

  getBaseComponent: ->
    if @valid then return @baseComponent
    @valid = true
    content = @content = @getContentComponent()
    content.holder = @
    content.container = @container
    content.mountBeforeNode = @mountBeforeNode
    baseComponent = content.getBaseComponent()
    if @mountCallbackList then baseComponent.mountCallbackComponentList.unshift @
    if @unmountCallbackList then baseComponent.unmountCallbackComponentList.push @
    @baseComponent = baseComponent

  getNode: -> @content and @content.getNode()


