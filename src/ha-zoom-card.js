import Panzoom from "@panzoom/panzoom"
import {doubleTap} from "./handlers"

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

  connectedCallback() {
    const fn = () => {
      this._card(this._refCard)
    }

    if (this._refCard.updateComplete) {
      this._refCard.updateComplete.then(fn)
    } else {
      fn()
    }

    if (!this.panzoom) {
      const {zoomOptions, tapTimeout} = this.config
      const {step = 1, maxScale = 6, ...config} = zoomOptions || {}
      const zoomTarget = this.zoomable.firstElementChild
      this.panzoom = Panzoom(zoomTarget, {
        contain: "outside",
        step,
        maxScale,
        panOnlyWhenZoomed: true,
        ...config,
      })
      zoomTarget.addEventListener("wheel", this.panzoom.zoomWithWheel)
      zoomTarget.addEventListener(
        "touchend",
        doubleTap(this.handleZoom(), tapTimeout)
      )
      zoomTarget.addEventListener("dblclick", this.handleZoom())
    }
  }

  handleZoom = () => (event) => {
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
        element.shadowRoot.querySelector("ha-card").style.boxShadow = "none"
        element.shadowRoot.querySelector("ha-card").style.borderRadius = "0px"
      }
    } else {
      if (
        typeof element.querySelector === "function" &&
        element.querySelector("ha-card")
      ) {
        element.querySelector("ha-card").style.boxShadow = "none"
        element.querySelector("ha-card").style.borderRadius = "0px"
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
