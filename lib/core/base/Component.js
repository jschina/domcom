var Component, dc, dcEventMixin, extend, flow, flowBind, isArray, isComponent, newDcid, normalizeDomElement, _ref;

extend = require('extend');

normalizeDomElement = require('../../dom-util').normalizeDomElement;

_ref = require('dc-util'), newDcid = _ref.newDcid, isArray = _ref.isArray;

flow = require('lazy-flow').flow;

flowBind = flow.bind;

isComponent = require('./isComponent');

dc = require('../../dc');

module.exports = Component = (function() {
  function Component() {
    this.dcid = newDcid();
    this.listeners = this.listeners || {};
    this.baseComponent = null;
    this.parentNode = null;
    this.nextNode = null;
    this.node = null;
    this.holder = null;
    this.valid = true;
    this.attachValid = true;
    this.removing = false;
    this.removed = false;
    this.destroyed = false;
    this.setReactive();
  }

  Component.prototype._prepareMount = function(mountNode, beforeNode) {
    if (mountNode && mountNode.component) {
      mountNode = mountNode.component;
    } else if (beforeNode && beforeNode.component) {
      console.log(mountNode);
      console.log(beforeNode);
      throw new Error('error while mounting: mountNode is not a component, but beforeNode is a component');
    }
    if (isComponent(mountNode)) {
      if (!beforeNode) {
        if (!mountNode.children) {
          console.log(mountNode);
          throw new Error('error while mounting: mountNode is a component, but is not a Tag or List component');
        }
        return mountNode.pushChild(this);
      } else {
        if (!isComponent(beforeNode)) {
          beforeNode = beforeNode.component;
          if (!beforeNode) {
            console.log(beforeNode);
            throw new Error('error while mounting: can not mount beforeNode');
          }
        }
        if (beforeNode.holder !== mountNode || !mountNode.children) {
          console.log(mountNode);
          console.log(beforeNode);
          throw new Error('both mountNode and beforeNode is component, but mountNode is not the parent of beforeNode');
        }
        return mountNode.insertChildBefore(this, beforeNode);
      }
    } else {
      this.parentNode = normalizeDomElement(mountNode) || this.parentNode || document.body;
      this.nextNode = beforeNode || this.nextNode;
      this.setHolder(dc);
      this.clearRemoving();
      return dc.rootComponentMap[this.dcid] = this;
    }
  };


  /* if mountNode is given, it should not be the node of any Component
  only use beforeNode if mountNode is given
   */

  Component.prototype.mount = function(mountNode, beforeNode, forceRender) {
    this.emit('willMount');
    this._prepareMount(mountNode, beforeNode);
    this.render(forceRender);
    return this.emit('didMount');
  };

  Component.prototype.unmount = function(forceRender) {
    this.emit('willUnmount');
    this.remove();
    return this.emit('didUnmount');
  };

  Component.prototype.remove = function() {
    var firstNode, holder, prevComponent, prevNode;
    holder = this.holder;
    if (!holder || holder === dc) {
      delete dc.rootComponentMap[this.dcid];
      firstNode = this.firstNode;
      if (firstNode && firstNode.parentNode) {
        if ((prevNode = firstNode.previousSibling) && (prevComponent = prevNode.component)) {
          prevComponent.setNextNode(this.nextNode);
        }
        this.removeNode();
      }
    } else if (holder && holder.children) {
      holder.removeChild(this);
    } else if (holder) {
      dc.error('Should not remove the content of TransformComponent');
    }
    return this;
  };

  Component.prototype.render = function(forceRender) {
    if (!this.destroyed && (forceRender || dc.alwaysRender || !dc.renderBySystemLoop)) {
      if (this.removing) {
        this.removeDom();
      } else if (!this.removed) {
        this.refreshDom(this.baseComponent);
      }
    }
    return this;
  };

  Component.prototype.replace = function(oldComponent, forceRender) {
    var holder;
    if (!this.destroyed && this !== oldComponent && !oldComponent.removing && !oldComponent.removed) {
      holder = oldComponent.holder;
      if (holder && holder !== dc) {
        if (holder.isTransformComponent) {
          dc.error('Should not replace the content of TransformComponent');
        } else {
          holder.replaceChild(oldComponent, this);
          holder.render(forceRender);
          oldComponent.removeDom();
        }
      } else if (holder === dc) {
        this.parentNode = oldComponent.parentNode;
        this.nextNode = oldComponent.nextNode;
        oldComponent.markRemovingDom();
        this.setHolder(holder);
        this.invalidate();
        dc.rootComponentMap[this.dcid] = this;
        dc.rootComponentMap[oldComponent.dcid] = oldComponent;
        this.render(forceRender);
        oldComponent.removeDom();
      }
    }
    return this;
  };


  /*
  component.renderWhen components, events, options
  component.renderWhen setInterval, interval, options
  component.renderWhen setTimeout, interval, options
   */

  Component.prototype.renderWhen = function(cause, events, options) {
    options = options || {};
    options.target = [this];
    dc.renderWhen(cause, events, options);
    return this;
  };

  Component.prototype.destroy = function() {
    this.emit('willDestroy');
    this.executeDestroy();
    return this.emit('didDestroy');
  };

  Component.prototype.executeDestroy = function() {
    this.unmount(true);
    this.destroyed = true;
    this.listeners = null;
    if (this.node) {
      this.node.component = null;
      this.node = null;
    }
    this.baseComponent = null;
    return this.parentNode = null;
  };

  Component.prototype.getPrevComponent = function() {
    var children, holder;
    if (!(holder = this.holder)) {
      return null;
    } else if (children = holder.children) {
      return children[children.indexOf(this) - 1];
    }
  };

  Component.prototype.getNextComponent = function() {
    var children, holder;
    if (!(holder = this.holder)) {
      return null;
    } else if (children = holder.children) {
      return children[children.indexOf(this) - 1];
    }
  };

  Component.prototype.setNextNode = function(nextNode) {
    this.nextNode = nextNode;
  };

  Component.prototype.setHolder = function(holder) {
    if (this.holder && this.holder !== holder) {
      this.holder.invalidateAttach(this);
    }
    this.holder = holder;
    return this;
  };

  Component.prototype.isOffspringOf = function(ancestor) {
    var holder;
    holder = this.holder;
    while (holder) {
      if (holder === ancestor) {
        return true;
      }
      holder = holder.holder;
    }
    return false;
  };

  Component.prototype.inFamilyOf = function(ancestor) {
    return this === ancestor || this.isOffspringOf(ancestor);
  };

  Component.prototype.setReactive = function() {
    var invalidateThis, me, reactField, reactive, srcField, _ref1;
    if (this.reactMap) {
      me = this;
      invalidateThis = function() {
        return me.invalidate();
      };
      _ref1 = this.reactMap;
      for (srcField in _ref1) {
        reactField = _ref1[srcField];
        reactive = flowBind(this, srcField);
        if (typeof reactField === 'string') {
          reactive.onInvalidate(function() {
            var reaction;
            if (reaction = me[reactField]) {
              return reaction.invalidate();
            }
          });
        } else {
          reactive.onInvalidate(invalidateThis);
        }
      }
    }
    return this;
  };

  Component.prototype.copyEventListeners = function(srcComponent) {
    var event, myListeners, srcListeners;
    myListeners = this.listeners;
    srcListeners = srcComponent.listeners;
    for (event in srcListeners) {
      srcListeners[event] && (myListeners[event] = srcListeners[event].splice());
    }
    return this;
  };

  return Component;

})();

dcEventMixin = require('../../dc-event');

extend(Component.prototype, dcEventMixin);
