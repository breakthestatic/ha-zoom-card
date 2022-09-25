import Panzoom from "@panzoom/panzoom"
import doubleTap from './doubleTap'

class ZoomCard extends HTMLElement {
  constructor() {
    super();
    // Make use of shadowRoot to avoid conflicts when reusing
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }

    this.config = config
    this.style.boxShadow =
      "var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2))";
    this.style.borderRadius = "var(--ha-card-border-radius, 2px)";
    this.style.background = "var(--paper-card-background-color)";
    this.style.display = "block";
    // this.style.position = "relative"

    const root = this.shadowRoot;
    while (root.hasChildNodes()) {
      root.removeChild(root.lastChild);
    }

    // Wrap main card
    const wrapper = document.createElement("div");
    this.zoomable = document.createElement("div");
    wrapper.setAttribute("style", "position:relative");
    this.zoomable.appendChild(wrapper)
    root.appendChild(this.zoomable);

    this._refCards = [];

    const _createThing = (tag, config) => {
      const element = document.createElement(tag);

      try {
        element.setConfig(config);
      } catch (err) {
        console.error(tag, err);
        return _createError(err.message, config);
      }
      return element;
    };

    const _createError = (error, config) => {
      return _createThing("hui-error-card", {
        type: "error",
        error,
        config
      });
    };

    const _fireEvent = (ev, detail, entity = null) => {
      ev = new Event(ev, {
        bubbles: true,
        cancelable: false,
        composed: true
      });

      ev.detail = detail || {};

      if (entity) {
        entity.dispatchEvent(ev);
      } else {
        document
          .querySelector("home-assistant")
          .shadowRoot.querySelector("home-assistant-main")
          .shadowRoot.querySelector("app-drawer-layout partial-panel-resolver")
          .shadowRoot.querySelector("ha-panel-lovelace")
          .shadowRoot.querySelector("hui-root")
          .shadowRoot.querySelector("ha-app-layout #view")
          .firstElementChild.dispatchEvent(ev);
      }
    };

    config.cards.forEach(item => {
      let tag = item.type;

      if (tag.startsWith("divider")) {
        tag = `hui-divider-row`;
      } else if (tag.startsWith("custom:")) {
        tag = tag.substr("custom:".length);
      } else {
        tag = `hui-${tag}-card`;
      }

      if (customElements.get(tag)) {
        const element = _createThing(tag, item);

        wrapper.appendChild(element);

 

        this._refCards.push(element);
      } else {
        // If element doesn't exist (yet) create an error
        const element = _createError(
          `Custom element doesn't exist: ${tag}.`,
          item
        );
        element.style.display = "None";

        const time = setTimeout(() => {
          element.style.display = "";
        }, 2000);

        // Remove error if element is defined later
        customElements.whenDefined(tag).then(() => {
          clearTimeout(time);
          _fireEvent("ll-rebuild", {}, element);
        });

        root.appendChild(element);
        this._refCards.push(element);
      }
    });
  }

  set hass(hass) {
    if (this._refCards) {
      this._refCards.forEach(card => {
        card.hass = hass;
      });
    }
  }

  connectedCallback() {
    this._refCards.forEach(element => {
      let fn = () => {
        this._card(element);
      };

      if (element.updateComplete) {
        element.updateComplete.then(fn);
      } else {
        fn();
      }
    });

    if (!this.panzoom) {
      const zoomTarget = this.zoomable.firstElementChild
      this.panzoom = Panzoom(zoomTarget, {
        contain: "outside",
        step: this.config.step,
        maxScale: this.config.maxScale
      })
      zoomTarget.addEventListener("wheel", this.panzoom.zoomWithWheel)
      zoomTarget.addEventListener("touchend", doubleTap(this.handleZoom.bind(this)))
      zoomTarget.addEventListener("dblclick", this.handleZoom.bind(this))
    }
  }

  handleZoom(event) {
    if (this.panzoom.getScale() >= this.panzoom.getOptions().maxScale) {
      this.panzoom.reset(event)
    } else {
      this.panzoom.zoomIn(event)
    }
  }

  _card(element) {
    if (element.shadowRoot) {
      if (!element.shadowRoot.querySelector("ha-card")) {
        let searchEles = element.shadowRoot.getElementById("root");
        if (!searchEles) {
          searchEles = element.shadowRoot.getElementById("card");
        }
        if (!searchEles) return;
        searchEles = searchEles.childNodes;

        for (let i = 0; i < searchEles.length; i++) {
          if (searchEles[i].style !== undefined) {
            searchEles[i].style.margin = "0px";
          }
          this._card(searchEles[i]);
        }
      } else {
        element.shadowRoot.querySelector("ha-card").style.boxShadow = "none";
      }
    } else {
      if (
        typeof element.querySelector === "function" &&
        element.querySelector("ha-card")
      ) {
        element.querySelector("ha-card").style.boxShadow = "none";
      }
      let searchEles = element.childNodes;
      for (let i = 0; i < searchEles.length; i++) {
        if (searchEles[i] && searchEles[i].style) {
          searchEles[i].style.margin = "0px";
        }
        this._card(searchEles[i]);
      }
    }
  }

  getCardSize() {
    let totalSize = 0;
    this._refCards.forEach(element => {
      totalSize +=
        typeof element.getCardSize === "function" ? element.getCardSize() : 1;
    });
    return totalSize;
  }
}

customElements.define("zoom-card", ZoomCard);