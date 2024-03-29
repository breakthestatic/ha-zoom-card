import Panzoom from "@panzoom/panzoom"
import {doubleTap} from "./handlers"
import {removeBorders} from "./util"

class ZoomCard extends HTMLElement {
  constructor() {
    super()
    // Make use of shadowRoot to avoid conflicts when reusing
    this.attachShadow({mode: "open"})
  }

  createThing(tag, config) {
    const element = document.createElement(tag)

    try {
      element.setConfig(config)
    } catch (err) {
      console.error(tag, err)
      return this.createError(err.message, config)
    }
    return element
  }

  createError(error, config) {
    return this.createThing("hui-error-card", {type: "error", error, config})
  }

  fireEvent(event, detail, entity = null) {
    event = new Event(event, {
      bubbles: true,
      cancelable: false,
      composed: true,
    })

    event.detail = detail || {}

    if (entity) {
      entity.dispatchEvent(event)
    } else {
      document
        .querySelector("home-assistant")
        .shadowRoot.querySelector("home-assistant-main")
        .shadowRoot.querySelector("app-drawer-layout partial-panel-resolver")
        .shadowRoot.querySelector("ha-panel-lovelace")
        .shadowRoot.querySelector("hui-root")
        .shadowRoot.querySelector("ha-app-layout #view")
        .firstElementChild.dispatchEvent(event)
    }
  }

  setConfig(config) {
    if (!config || !config.card) {
      throw new Error("Card config incorrect")
    }

    this.config = config

    const root = this.shadowRoot

    // Remove all children
    while (root.hasChildNodes()) {
      root.removeChild(root.lastChild)
    }

    // Wrap main card
    const wrapper = document.createElement("div")
    this.zoomable = document.createElement("ha-card")
    wrapper.setAttribute("style", "position:relative")
    this.zoomable.appendChild(wrapper)
    root.appendChild(this.zoomable)

    this._refCard = null

    const {type} = config.card
    const tag = type.startsWith("custom:")
      ? type.substr("custom:".length)
      : `hui-${type}-card`

    if (customElements.get(tag)) {
      const element = this.createThing(tag, config.card)

      wrapper.appendChild(element)

      this._refCard = element
    } else {
      // If element doesn't exist (yet) create an error
      const element = this.createError(
        `Custom element doesn't exist: ${tag}.`,
        config.card
      )
      element.style.display = "None"

      const time = setTimeout(() => {
        element.style.display = ""
      }, 2000)

      // Remove error if element is defined later
      customElements.whenDefined(tag).then(() => {
        clearTimeout(time)
        this.fireEvent("ll-rebuild", {}, element)
      })

      root.appendChild(element)
      this._refCard = element
    }
  }

  set hass(hass) {
    if (this._refCard) {
      this._refCard.hass = hass
    }
  }

  initPanzoom = () => {
    const {tapTimeout, target, zoomOptions} = this.config
    const {step = 1, maxScale = 6, ...config} = zoomOptions || {}
    const zoomTarget = target
      ? this.zoomable.querySelector(target)
      : this.zoomable.firstElementChild

    // Don't init panzoom if already initialized or zoom target doesn't exist
    if (this.panzoom || !zoomTarget) return

    this.panzoom = Panzoom(zoomTarget, {
      contain: "outside",
      step,
      maxScale,
      panOnlyWhenZoomed: true,
      setTransform: (_, {scale, x, y}) => {
        // Remove transformations when scale is ~ 1
        // Alleviates issue with extra pixels at bottom of zoomed element
        if (scale < 1.001) {
          this.panzoom.setStyle("transform", "")
        } else {
          this.panzoom.setStyle(
            "transform",
            `scale(${scale}) translate3d(${parseInt(x)}px, ${parseInt(y)}px, 0px)`
          )
        }
      },
      ...config,
    })

    if (zoomTarget.closest("ha-card") !== this.zoomable) {
      removeBorders(zoomTarget.closest("ha-card"))
    }

    zoomTarget.addEventListener("wheel", this.panzoom.zoomWithWheel)
    zoomTarget.addEventListener("touchend", doubleTap(this.handleZoom, tapTimeout))
    zoomTarget.addEventListener("dblclick", this.handleZoom)
  }

  connectedCallback() {
    const fn = () => {
      this._card(this._refCard)
    }

    if (this._refCard.updateComplete) {
      this._refCard.updateComplete.then(fn)
    } else {
      fn()
    }

    // Panzoom already initialized
    if (this.panzoom) return

    if (this.config.target) {
      new MutationObserver(this.initPanzoom).observe(this.zoomable, {
        childList: true,
        subtree: true,
      })
    } else {
      this.initPanzoom()
    }
  }

  handleZoom = (event) => {
    if (this.panzoom.getScale() >= this.panzoom.getOptions().maxScale) {
      this.panzoom.reset(event)
    } else {
      this.panzoom.zoomIn(event)
    }
  }

  _card(element) {
    if (element.shadowRoot) {
      if (!element.shadowRoot.querySelector("ha-card")) {
        let searchEles = element.shadowRoot.getElementById("root")
        if (!searchEles) {
          searchEles = element.shadowRoot.getElementById("card")
        }
        if (!searchEles) return
        searchEles = searchEles.childNodes

        for (let i = 0; i < searchEles.length; i++) {
          if (searchEles[i].style !== undefined) {
            searchEles[i].style.margin = "0px"
          }
          this._card(searchEles[i])
        }
      } else {
        removeBorders(element.shadowRoot.querySelector("ha-card"))
      }
    } else {
      if (
        typeof element.querySelector === "function" &&
        element.querySelector("ha-card")
      ) {
        removeBorders(element.querySelector("ha-card"))
      }
      const searchEles = element.childNodes
      for (let i = 0; i < searchEles.length; i++) {
        if (searchEles[i] && searchEles[i].style) {
          searchEles[i].style.margin = "0px"
        }
        this._card(searchEles[i])
      }
    }
  }

  getCardSize() {
    const totalSize =
      typeof this._refCard.getCardSize === "function"
        ? this._refCard.getCardSize()
        : 1

    return totalSize
  }
}

customElements.define("zoom-card", ZoomCard)
