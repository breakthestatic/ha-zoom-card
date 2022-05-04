import Panzoom from "@panzoom/panzoom"
import Deferred from "./Deferred"

class ZoomCard extends HTMLElement {
  constructor() {
    super()
  }

  connectedCallback() {
    if (this.card) {
      this.panzoom = Panzoom(this.cardWrapper, {contain: "outside"})
      this.cardWrapper.addEventListener("wheel", this.panzoom.zoomWithWheel)
    }
  }

  setConfig(config) {
    this.rendered = new Deferred()

    if (!config || !config.card) {
      throw new Error("Card config incorrect")
    }
    this.config = config
    this.card = null
    this.renderCard()
  }

  async renderCard() {
    if (window.loadCardHelpers) {
      this.helpers = await window.loadCardHelpers()
    }

    this.card = await this.createCardElement(this.config.card)
    this.cardWrapper = document.createElement("div")

    // Style cards
    if (this.card.updateComplete) {
      this.card.updateComplete.then(() => this.styleCard(this.card))
    } else {
      this.styleCard(this.card)
    }

    // Create the card
    const root = document.createElement("ha-card")
    this.cardWrapper.appendChild(this.card)

    root.appendChild(this.cardWrapper)
    while (this.hasChildNodes()) {
      this.removeChild(this.lastChild)
    }
    this.appendChild(root)

    // Calculate card size
    this.rendered.resolve()
  }

  async createCardElement(cardConfig) {
    const createError = (error, origConfig) => {
      return createThing("hui-error-card", {
        type: "error",
        error,
        origConfig,
      })
    }

    const createThing = (tag, config) => {
      if (this.helpers) {
        return this.helpers.createCardElement(config)
      }

      const element = document.createElement(tag)
      try {
        element.setConfig(config)
      } catch (err) {
        console.error(tag, err)
        return createError(err.message, config)
      }
      return element
    }

    let tag = cardConfig.type
    if (tag.startsWith("custom:")) {
      tag = tag.substr("custom:".length)
    } else {
      tag = `hui-${tag}-card`
    }

    const element = createThing(tag, cardConfig)
    element.hass = this.hass
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation()
        this.createCardElement(cardConfig).then(() => {
          this.renderCard()
        })
      },
      {once: true}
    )
    return element
  }

  set hass(hass) {
    this.hass = hass
    if (this.card) {
      this.card.hass = hass
    }
  }

  styleCard(element) {
    if (element.shadowRoot) {
      if (element.shadowRoot.querySelector("ha-card")) {
        const ele = element.shadowRoot.querySelector("ha-card")
        ele.style.boxShadow = "none"
        ele.style.borderRadius = "0"
      } else {
        let searchEles = element.shadowRoot.getElementById("root")
        if (!searchEles) {
          searchEles = element.shadowRoot.getElementById("card")
        }
        if (!searchEles) return
        searchEles = searchEles.childNodes
        for (let i = 0; i < searchEles.length; i++) {
          if (searchEles[i].style) {
            searchEles[i].style.margin = "0px"
          }
          this.styleCard(searchEles[i])
        }
      }
    } else {
      if (
        typeof element.querySelector === "function" &&
        element.querySelector("ha-card")
      ) {
        const ele = element.querySelector("ha-card")
        ele.style.boxShadow = "none"
        ele.style.borderRadius = "0"
      }
      const searchEles = element.childNodes
      for (let i = 0; i < searchEles.length; i++) {
        if (searchEles[i] && searchEles[i].style) {
          searchEles[i].style.margin = "0px"
        }
        this.styleCard(searchEles[i])
      }
    }
  }

  _computeCardSize(card) {
    if (typeof card.getCardSize === "function") {
      return card.getCardSize()
    }
    return customElements
      .whenDefined(card.localName)
      .then(() => this._computeCardSize(card))
      .catch(() => 1)
  }

  async getCardSize() {
    await this.rendered
    return await this._computeCardSize(this.card)
  }
}

customElements.define("zoom-card", ZoomCard)
